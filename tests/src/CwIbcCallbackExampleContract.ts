/**
* This file was automatically generated by @cosmwasm/ts-codegen@0.5.8.
* DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
* and run the @cosmwasm/ts-codegen generate command to regenerate this file.
*/

import { CosmWasmClient, ExecuteResult, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { Coin, StdFee } from "@cosmjs/amino";
export type ExecuteMsg = {
  increment: {
    channel: string;
    [k: string]: unknown;
  };
};
export interface GetCountResponse {
  count: number;
  [k: string]: unknown;
}
export type IbcExecuteMsg = {
  increment: {
    [k: string]: unknown;
  };
};
export interface InstantiateMsg {
  [k: string]: unknown;
}
export type QueryMsg = {
  get_count: {
    channel: string;
    [k: string]: unknown;
  };
};
export interface CwIbcCallbackExampleReadOnlyInterface {
  contractAddress: string;
  getCount: ({
    channel
  }: {
    channel: string;
  }) => Promise<GetCountResponse>;
}
export class CwIbcCallbackExampleQueryClient implements CwIbcCallbackExampleReadOnlyInterface {
  client: CosmWasmClient;
  contractAddress: string;

  constructor(client: CosmWasmClient, contractAddress: string) {
    this.client = client;
    this.contractAddress = contractAddress;
    this.getCount = this.getCount.bind(this);
  }

  getCount = async ({
    channel
  }: {
    channel: string;
  }): Promise<GetCountResponse> => {
    return this.client.queryContractSmart(this.contractAddress, {
      get_count: {
        channel
      }
    });
  };
}
export interface CwIbcCallbackExampleInterface extends CwIbcCallbackExampleReadOnlyInterface {
  contractAddress: string;
  sender: string;
  increment: ({
    channel
  }: {
    channel: string;
  }, fee?: number | StdFee | "auto", memo?: string, funds?: readonly Coin[]) => Promise<ExecuteResult>;
}
export class CwIbcCallbackExampleClient extends CwIbcCallbackExampleQueryClient implements CwIbcCallbackExampleInterface {
  client: SigningCosmWasmClient;
  sender: string;
  contractAddress: string;

  constructor(client: SigningCosmWasmClient, sender: string, contractAddress: string) {
    super(client, contractAddress);
    this.client = client;
    this.sender = sender;
    this.contractAddress = contractAddress;
    this.increment = this.increment.bind(this);
  }

  increment = async ({
    channel
  }: {
    channel: string;
  }, fee: number | StdFee | "auto" = "auto", memo?: string, funds?: readonly Coin[]): Promise<ExecuteResult> => {
    return await this.client.execute(this.sender, this.contractAddress, {
      increment: {
        channel
      }
    }, fee, memo, funds);
  };
}