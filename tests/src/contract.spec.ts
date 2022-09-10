import { CosmWasmSigner, Link, testutils } from "@confio/relayer";
import { ChannelPair } from "@confio/relayer/build/lib/link";
import { assert } from "@cosmjs/utils";
import test from "ava";
import { Order } from "cosmjs-types/ibc/core/channel/v1/channel";
import {ExecuteMsg, QueryMsg, IncrementMsgAcknowledgement} from "./SimpleIbcCallback.types";

const {
  osmosis: oldOsmo,
  setup,
  wasmd,
} = testutils;
const osmosis = { ...oldOsmo, minFee: "0uosmo" };

import {
  IbcVersion,
  setupContracts,
  setupOsmosisClient,
  setupWasmClient,
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

test.serial("connect channel , execute increment and does callback via ibc", async (t) => {
  const {
    wasmClient,
    wasmContr,
    link,
    channelPair,
  } = await demoSetup();
  // increment counter in dst chain
  let executemsg: ExecuteMsg = { increment: { channel: channelPair.dest.channelId, callback: true } };
  await wasmClient.sign.execute(wasmClient.senderAddress, wasmContr, executemsg, "auto");

  // relay packets
  let info = await link.relayAll();
  let ackData: IncrementMsgAcknowledgement = parseAcknowledgementSuccess(info.acksFromB[0]);
  t.assert(true == ackData.callback, "expected true for a callback varieble");

  const queryDestMsg: QueryMsg = { get_count: { count: CallbackCounter } };
  let queryRes = await wasmClient.sign.queryContractSmart(wasmContr, queryDestMsg);
  t.assert(queryRes.count == 2, `expected 2, got ${queryRes.count}`)

  // execute and get result again
  await wasmClient.sign.execute(wasmClient.senderAddress, wasmContr, executemsg, "auto");
  info = await link.relayAll();
  parseAcknowledgementSuccess(info.acksFromB[0]);

  queryRes = await wasmClient.sign.queryContractSmart(wasmContr, queryDestMsg);
  t.assert(queryRes.count == 4, `expected 4, got ${queryRes.count}`)

  t.pass("")
});

test.serial("increment and doesn't do callback via ibc", async (t) => {
  const {
    wasmClient,
    wasmContr,
    link,
    channelPair,
  } = await demoSetup();
  // increment counter in dst chain
  let executemsg: ExecuteMsg = { increment: { channel: channelPair.dest.channelId, callback: false } };
  await wasmClient.sign.execute(wasmClient.senderAddress, wasmContr, executemsg, "auto");

  // relay packets
  let info = await link.relayAll();
  let ackData: IncrementMsgAcknowledgement = parseAcknowledgementSuccess(info.acksFromB[0]);
  console.log(ackData)
  t.assert(false == ackData.callback, "expected to be false for callback variable");

  const queryDestMsg: QueryMsg = { get_count: { count: CallbackCounter } };
  let queryRes = await wasmClient.sign.queryContractSmart(wasmContr, queryDestMsg);
  t.assert(queryRes.count == 0, `expected 0, got ${queryRes.count}`)

  t.pass("")
});
