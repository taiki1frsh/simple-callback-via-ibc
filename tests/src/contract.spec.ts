import { CosmWasmSigner, Link, testutils } from "@confio/relayer";
import { ChannelPair } from "@confio/relayer/build/lib/link";
// import { CosmWasmClient, SigningCosmWasmClient, ExecuteResult } from "@cosmjs/cosmwasm-stargate";
import { assert } from "@cosmjs/utils";
import test from "ava";
import { Order } from "cosmjs-types/ibc/core/channel/v1/channel";
// import { SimpleIbcCallbackClient } from "./SimpleIbcCallback.client";
import {ExecuteMsg, QueryMsg} from "./SimpleIbcCallback.types";

const {
  osmosis: oldOsmo,
  setup,
  wasmd,
  // randomAddress,
} = testutils;
const osmosis = { ...oldOsmo, minFee: "0uosmo" };

import {
  // assertPacketsFromA,
  IbcVersion,
  // parseAcknowledgementSuccess,
  setupContracts,
  setupOsmosisClient,
  setupWasmClient,
  // setupContractClient,
  parseAcknowledgementSuccess,
  CallbackCounter,
} from "./utils";

let wasmIds: Record<string, number> = {};
let osmosisIds: Record<string, number> = {};

test.before(async (t) => {
  console.debug("Upload contract to wasmd...");
  const wasmContracts = {
    cw_ibc_callback: "./testdata/cw_ibc_callback_example-aarch64.wasm",
  };
  const wasmSign = await setupWasmClient();
  wasmIds = await setupContracts(wasmSign, wasmContracts);

  console.debug("Upload contract to osmosis...");
  const osmosisContracts = {
    cw_ibc_callback: "./testdata/cw_ibc_callback_example-aarch64.wasm",
  };
  const osmosisSign = await setupOsmosisClient();
  osmosisIds = await setupContracts(osmosisSign, osmosisContracts);

  t.pass();
});

test.serial("set up channel with contract", async (t) => {
  // instantiate contract on wasmd
  const wasmClient = await setupWasmClient();

  // construct contract client
  const initContractWasmd = {};

  const { contractAddress: wasm } = await wasmClient.sign.instantiate(
    wasmClient.senderAddress,
    wasmIds.cw_ibc_callback,
    initContractWasmd,
    "simple ibc callback",
    "auto"
  );
  t.truthy(wasm);
  // const contractClient = await setupContractClient(wasm);
  // console.log(contractClient.contractAddress)
  const { ibcPortId: Port } = await wasmClient.sign.getContract(wasm);
  t.log(`Wasm Port: ${Port}`);
  assert(Port);

  // construct contract client
  const initContractOsmo = {};
  const osmoClient = await setupOsmosisClient();

  const { contractAddress: osmo } = await osmoClient.sign.instantiate(
    osmoClient.senderAddress,
    osmosisIds.cw_ibc_callback,
    initContractOsmo,
    "simple ibc callback",
    "auto"
  );
  t.truthy(osmo);
  const { ibcPortId: hostPort } = await osmoClient.sign.getContract(osmo);
  t.log(`Osmo Port: ${hostPort}`);
  assert(hostPort);

  const [src, dest] = await setup(wasmd, osmosis);
  const link = await Link.createWithNewConnections(src, dest);
  await link.createChannel("A", Port, hostPort, Order.ORDER_UNORDERED, IbcVersion);
});

interface SetupInfo {
  wasmClient: CosmWasmSigner;
  osmoClient: CosmWasmSigner;
  wasmContr: string;
  osmoContr: string;
  link: Link;
  channelPair: ChannelPair;
}

async function demoSetup(): Promise<SetupInfo> {
  // instantiate contract on wasmd
  const wasmClient = await setupWasmClient();
  const initContractWasmd = {};
  const { contractAddress: wasmContr } = await wasmClient.sign.instantiate(
    wasmClient.senderAddress,
    wasmIds.cw_ibc_callback,
    initContractWasmd,
    "simple ibc callback",
    "auto"
  );
  const { ibcPortId: wasmPort } = await wasmClient.sign.getContract(wasmContr);
  assert(wasmPort);

  // instantiate contract on osmosis
  const osmoClient = await setupOsmosisClient();
  const { contractAddress: osmoContr } = await osmoClient.sign.instantiate(
    osmoClient.senderAddress,
    osmosisIds.cw_ibc_callback,
    initContractWasmd,
    "simple ibc callback",
    "auto"
  );
  const { ibcPortId: osmoPort } = await osmoClient.sign.getContract(osmoContr);
  assert(osmoPort);

  // create a connection and channel for simple-ica
  const [src, dest] = await setup(wasmd, osmosis);
  const link = await Link.createWithNewConnections(src, dest);
  const channelPair = await link.createChannel("A", wasmPort, osmoPort, Order.ORDER_UNORDERED, IbcVersion);

  return {
    wasmClient,
    osmoClient,
    wasmContr,
    osmoContr,
    link,
    channelPair,
  };
}

test.serial("connect channel and increment", async (t) => {
  const {
    wasmClient,
    // osmoClient,
    wasmContr,
    // osmoContr,
    link,
    channelPair,
  } = await demoSetup();

  // const contractClient = await setupContractClient(wasmContr);

  // increment counter in dst chain
  let executemsg: ExecuteMsg = { increment: { channel: channelPair.dest.channelId, callback: true } };
  await wasmClient.sign.execute(wasmClient.senderAddress, wasmContr, executemsg, "auto");

  // relay packets
  let info = await link.relayAll();
  let contractData = parseAcknowledgementSuccess(info.acksFromB[0]);

  const queryDestMsg: QueryMsg = { get_count: { count: CallbackCounter } };
  let queryRes = await wasmClient.sign.queryContractSmart(wasmContr, queryDestMsg);
  // console.debug(res);
  assert(queryRes.count == 2, `expected 2, got ${queryRes.count}`)

  // execute and get result again
  await wasmClient.sign.execute(wasmClient.senderAddress, wasmContr, executemsg, "auto");
  info = await link.relayAll();
  contractData = parseAcknowledgementSuccess(info.acksFromB[0]);
  console.debug(contractData)

  queryRes = await wasmClient.sign.queryContractSmart(wasmContr, queryDestMsg);
  console.debug(queryRes);
  assert(queryRes.count == 4, `expected 4, got ${queryRes.count}`)

  t.pass("")
});

// test.serial("control action on remote chain", async (t) => {
//   const { wasmClient, wasmController, link, osmoClient } = await demoSetup();

//   // there is an initial packet to relay for the whoami run
//   let info = await link.relayAll();
//   assertPacketsFromA(info, 1, true);

//   // get the account info
//   const accounts = await listAccounts(wasmClient, wasmController);
//   t.is(accounts.length, 1);
//   const { remote_addr: remoteAddr, channel_id: channelId } = accounts[0];
//   assert(remoteAddr);
//   assert(channelId);

//   // send some osmo to the remote address (using another funded account there)
//   const initFunds = { amount: "2500600", denom: osmosis.denomFee };
//   await osmoClient.sign.sendTokens(osmoClient.senderAddress, remoteAddr, [initFunds], "auto");

//   // make a new empty account on osmosis
//   const emptyAddr = randomAddress(osmosis.prefix);
//   const noFunds = await osmoClient.sign.getBalance(emptyAddr, osmosis.denomFee);
//   t.is(noFunds.amount, "0");

//   // from wasmd, send a packet to transfer funds from remoteAddr to emptyAddr
//   const sendFunds = { amount: "1200300", denom: osmosis.denomFee };
//   await remoteBankSend(wasmClient, wasmController, channelId, emptyAddr, [sendFunds]);

//   // relay this over
//   info = await link.relayAll();
//   assertPacketsFromA(info, 1, true);
//   // TODO: add helper for this
//   const contractData = parseAcknowledgementSuccess(info.acksFromB[0]);
//   // check we get { results : ['']} (one message with no data)
//   t.deepEqual(contractData, { results: [""] });

//   // ensure that the money was transfered
//   const gotFunds = await osmoClient.sign.getBalance(emptyAddr, osmosis.denomFee);
//   t.deepEqual(gotFunds, sendFunds);
// });

// test.serial("handle errors on dispatch", async (t) => {
//   const { wasmClient, wasmController, link, osmoClient } = await demoSetup();

//   // there is an initial packet to relay for the whoami run
//   let info = await link.relayAll();
//   assertPacketsFromA(info, 1, true);

//   // get the account info
//   const accounts = await listAccounts(wasmClient, wasmController);
//   t.is(accounts.length, 1);
//   const { remote_addr: remoteAddr, channel_id: channelId } = accounts[0];
//   assert(remoteAddr);
//   assert(channelId);

//   // send some osmo to the remote address (using another funded account there)
//   const initFunds = { amount: "2500600", denom: osmosis.denomFee };
//   await osmoClient.sign.sendTokens(osmoClient.senderAddress, remoteAddr, [initFunds], "auto");

//   // make a new empty account on osmosis
//   const emptyAddr = randomAddress(osmosis.prefix);
//   const noFunds = await osmoClient.sign.getBalance(emptyAddr, osmosis.denomFee);
//   t.is(noFunds.amount, "0");

//   // from wasmd, send a packet to transfer funds from remoteAddr to emptyAddr
//   const sendFunds = { amount: "1200300", denom: "no-such-funds" };
//   await remoteBankSend(wasmClient, wasmController, channelId, emptyAddr, [sendFunds]);

//   // relay this over
//   info = await link.relayAll();
//   assertPacketsFromA(info, 1, false);

//   // ensure that no money was transfered
//   const gotNoFunds = await osmoClient.sign.getBalance(emptyAddr, osmosis.denomFee);
//   t.is(gotNoFunds.amount, "0");
// });

// test.serial("properly rollback first submessage if second fails", async (t) => {
//   const { wasmClient, wasmController, link, osmoClient } = await demoSetup();

//   // there is an initial packet to relay for the whoami run
//   let info = await link.relayAll();
//   assertPacketsFromA(info, 1, true);

//   // get the account info
//   const accounts = await listAccounts(wasmClient, wasmController);
//   t.is(accounts.length, 1);
//   const { remote_addr: remoteAddr, channel_id: channelId } = accounts[0];
//   assert(remoteAddr);
//   assert(channelId);

//   // send some osmo to the remote address (using another funded account there)
//   const initFunds = { amount: "2500600", denom: osmosis.denomFee };
//   await osmoClient.sign.sendTokens(osmoClient.senderAddress, remoteAddr, [initFunds], "auto");

//   // make a new empty account on osmosis
//   const emptyAddr = randomAddress(osmosis.prefix);
//   const noFunds = await osmoClient.sign.getBalance(emptyAddr, osmosis.denomFee);
//   t.is(noFunds.amount, "0");

//   // from wasmd, send a packet to transfer funds from remoteAddr to emptyAddr
//   // first message with valid funds, second with invalid
//   // should return error ack, both transfers should eb rolled back
//   const goodSend = { amount: "1200300", denom: osmosis.denomFee };
//   const badSend = { amount: "1200300", denom: "no-such-funds" };
//   const contents = [
//     { to_address: emptyAddr, amount: [goodSend] },
//     { to_address: emptyAddr, amount: [badSend] },
//   ];
//   await remoteBankMultiSend(wasmClient, wasmController, channelId, contents);

//   // relay this over
//   info = await link.relayAll();
//   assertPacketsFromA(info, 1, false);

//   // ensure that no money was transfered
//   const gotNoFunds = await osmoClient.sign.getBalance(emptyAddr, osmosis.denomFee);
//   t.is(gotNoFunds.amount, "0");
// });
