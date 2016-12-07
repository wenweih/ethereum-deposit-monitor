pragma solidity ^0.4.0;

contract SmartExchange {
  address owner;

  event Deposit(
    address indexed _from,
    uint indexed _band,
    uint _value);

  function SmartExchange() {
    owner = msg.sender;
  }

  function kill() {
    if (msg.sender == owner) {
      suicide(owner);
    }
  }

  function collect() {
    if (msg.sender == owner) {
      owner.send(this.balance);
    }
  }

  function() payable {
    if (msg.value > 0) {
      Deposit(msg.sender, 88, msg.value);
    }
  }
}
