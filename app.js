#! /usr/bin/env node

var tokenAbi = [{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"standard","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[],"payable":false,"type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"},{"name":"_extraData","type":"bytes"}],"name":"approveAndCall","outputs":[{"name":"success","type":"bool"}],"payable":false,"type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"type":"function"},{"inputs":[{"name":"initialSupply","type":"uint256"},{"name":"tokenName","type":"string"},{"name":"decimalUnits","type":"uint8"},{"name":"tokenSymbol","type":"string"}],"type":"constructor"},{"payable":false,"type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}];

var assets = {
  peb: { tokenAddr: "0x727c0302393cd59254e0b9abfa1b61bdc4e43cfb", key: "peb" },
}

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

var connection = amqp.createConnection({url: "amqp://hww:hwwhww@192.168.203.2:5672"});
connection.on('error', function(err){
  console.log(err);
});

connection.on('ready', function(){
  console.log("READY FOR RABBITMQ CONNECTION");
  var exc = connection.exchange('ethereum.exchange', options = { type: 'fanout', durable: true, autoDelete: false, confirm: true  }, function(exchange){
    console.log('Echange ' + exchange.name + " is open");
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
      console.log("eth transaction: " + payload.transactionHash);
      exc.publish('', JSON.stringify(message),{}, function(){
        console.log("eth transaction message published");
      });
    });
  });

  for(var token_key in assets){
    if(token_key != undefined){
      var contractsList = loadTokenContractsList(token_key);
      tokenContract.at(assets[token_key].tokenAddr).Transfer().watch(function(err, payload) {
        addr = contractsList.find(function(addr){
          return addr == payload.args.to
        });

        if(addr){
          message = {
            txid: payload.transactionHash,
            amount: payload.args.value,
            address: payload.args.to,
            asset_key: assets[token_key].key
          };
          console.log(token_key + " transaction: " + payload.transactionHash);
          exc.publish('', JSON.stringify(message), {}, function(){
            console.log(token_key + " transaction message published");
          });
        }
      });
    }
  }

});

function loadTokenContractsList(token){
  var token_file = "contracts/" + token + ".csv";
  var fileContent = fs.readFileSync(token_file, "utf8").toString();
  var contractsList = fileContent.split("\n");
  if(contractsList[contractsList.length -1] == ""){
    contractsList.pop();
  }
  return contractsList;
}

function loadEthContractsList() {
  var fileContent = fs.readFileSync(eth_address_file, "utf8").toString();
  var contractsList = fileContent.split("\n");
  if(contractsList[contractsList.length - 1] == "") {
    contractsList.pop();
  }
  return contractsList;
}
