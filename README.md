# CosmWasm IBC Example

This is a simple IBC enabled CosmWasm smart contract. It expects to be
deployed on two chains and, when prompted, will send messages to its
counterpart. It then counts the number of times messages have been
received on both sides.

At a high level, to use this contract:

1. Store and instantiate the contract on two IBC enabled chains. We
   will call these chains chain A and chain B.
2. Configure and run a relayer to connect the two contracts.
3. Execute the `Increment {}` method on one contract to increment the
   send a message and increment the count on the other one.
4. Use the `GetCount { connection }` query to determine the message
   count for a given connection.

## Background

To connect two CosmWasm contracts over IBC you must establish an IBC
channel between them. The IBC channel establishment process uses a
four way handshake. Here is a summary of the steps:

1. `OpenInit` Hello chain B, here is information that you can use to
   verify I am chain A. Do you have information I can use?
2. `OpenTry` Hello chain A, I have verified that you are who you say
   you are. Here is my verification information.
3. `OpenAck` Hello chain B. Thank you for that information I have
   verified you are who you say you are. I am now ready to talk.
4. `OpenConfirm` Hello chain A. I am also now ready to talk.

Once the handshake has been completed a channel will be established
that the ibc messages may be sent over. In order to do a handshake and
receive IBC messages your contract must implement the following entry
points (see `src/ibc.rs`):

1. `ibc_channel_open` - Handles the `OpenInit` and `OpenTry` handshake
   steps.
2. `ibc_channel_connect` - Handles the `OpenAck` and `OpenConfirm`
   handshake steps.
3. `ibc_channel_close` - Handles the closing of an IBC channel by the
   counterparty.
4. `ibc_packet_receive` - Handles receiving IBC packets from the
   counterparty.
5. `ibc_packet_ack` - Handles ACK messages from the countarparty. This
   is effectively identical to the ACK message type in
   [TCP](https://developer.mozilla.org/en-US/docs/Glossary/TCP_handshake).
6. `ibc_packet_timeout` - Handles packet timeouts.

Having implemented these methods, once you instantiate an instance of
the contract it will be assigned a port. Ports identify a receiver on
a blockchain in much the same way as ports identify applications on a
computer.

## How to test

```shell
# run the local-osmosis chain
# ./ci-scripts/osmosis/start.sh

# run the local-wasmd chain
# ./ci-scripts/wasmd/start.sh

# build the wasm file and optimize by run this shell
./compile_optimize.sh
cp ./artifacts/cw_ibc_callback_example.wasm ./tests/testdata/
# if you use apple silicon, cw_ibc_callback_example-aarch64.wasm 

cd ./tests
npm run build
npm run test:unit
```
