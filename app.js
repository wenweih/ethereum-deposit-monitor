#! /usr/bin/env node
var tokenAbi = [ { "constant":false, "inputs":[  {  "name":"_spender", "type":"address" }, {  "name":"_value", "type":"uint256" } ], "name":"approve", "outputs":[  {  "name":"success", "type":"bool" } ], "type":"function" }, {  "constant":true, "inputs":[  ], "name":"totalSupply", "outputs":[  {  "name":"", "type":"uint256" } ], "type":"function" }, {  "constant":false, "inputs":[  {  "name":"_from", "type":"address" }, {  "name":"_to", "type":"address" }, {  "name":"_value", "type":"uint256" } ], "name":"transferFrom", "outputs":[  {  "name":"success", "type":"bool" } ], "type":"function" }, {  "constant":true, "inputs":[  ], "name":"badgeLedger", "outputs":[  {  "name":"", "type":"address" } ], "type":"function" }, {  "constant":true, "inputs":[  {  "name":"_owner", "type":"address" } ], "name":"balanceOf", "outputs":[  {  "name":"balance", "type":"uint256" } ], "type":"function" }, {  "constant":false, "inputs":[  {  "name":"_to", "type":"address" }, {  "name":"_value", "type":"uint256" } ], "name":"transfer", "outputs":[  {  "name":"success", "type":"bool" } ], "type":"function" }, {  "constant":true, "inputs":[  {  "name":"_owner", "type":"address" }, {  "name":"_spender", "type":"address" } ], "name":"allowance", "outputs":[  {  "name":"remaining", "type":"uint256" } ], "type":"function" }, {  "anonymous":false, "inputs":[  {  "indexed":true, "name":"_from", "type":"address" }, {  "indexed":true, "name":"_to", "type":"address" }, {  "indexed":false, "name":"_value", "type":"uint256" } ], "name":"Transfer", "type":"event" }, {  "anonymous":false, "inputs":[  {  "indexed":true, "name":"_recipient", "type":"address" }, {  "indexed":false, "name":"_amount", "type":"uint256" } ], "name":"Mint", "type":"event" }, {  "anonymous":false, "inputs":[  {  "indexed":true, "name":"_owner", "type":"address" }, {  "indexed":true, "name":"_spender", "type":"address" }, {  "indexed":false, "name":"_value", "type":"uint256" } ], "name":"Approval", "type":"event" } ];

var fs = require('fs');
var amqp = require('amqp');

var Web3 = require('web3');

var web3 = new Web3();
web3.setProvider(new web3.providers.HttpProvider('http://192.168.202.2:8545'));
var eth = web3.eth;

var smart_exchange_source_code = fs.readFileSync("contracts/SmartExchange.sol", "utf8");
var smart_exchange_compiled = web3.eth.compile.solidity(smart_exchange_source_code);
var smart_exchange_contract = web3.eth.contract(smart_exchange_compiled.SmartExchange.info.abiDefinition);
var tokenContract = web3.eth.contract(tokenAbi);

var eth_address_file = 'contracts/eth.csv';

var connection = amqp.createConnection({url: "amqp://hww:hwwhww@192.168.0.2:5672"});
connection.on('error', function(err){
  console.log(err);
});

connection.on('ready', function(){
  console.log("READY FOR RABBITMQ CONNECTION");
  var exc = connection.exchange('ethereum.exchange', options = { type: 'fanout', durable: true, autoDelete: false  }, function(exchange){
    console.log('Echange' + exchange.name + "is open");
  });

  var ethcontractsList = loadEthContractsList();

  ethcontractsList.forEach(function(addr){
    smart_exchange_contract.at(addr.trim()).Deposit().watch(function(err,payload){
      message = {
        txid: payload.transactionHash,
        amount: web3.fromWei(payload.args._value, 'ether'),
        address: payload.address,
        asset_key: 'eth'
      };
      console.log("hello" + payload.transactionHash);
      exc.publish('', JSON.stringify(message),{}, function(){
        console.log("PUBLISHING");
      });
    });
  });

});

function loadEthContractsList() {
  var fileContent = fs.readFileSync(eth_address_file, "utf8").toString();
  var contractsList = fileContent.split("\r\n");
  if(contractsList[contractsList.length - 1] == "") {
    contractsList.pop();
  }
  return contractsList;
}
