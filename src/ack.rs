use cosmwasm_std::{to_binary, Binary};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// IBC ACK. See:
/// https://github.com/cosmos/cosmos-sdk/blob/f999b1ff05a4db4a338a855713864497bedd4396/proto/ibc/core/channel/v1/channel.proto#L141-L147
#[derive(Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum Ack {
    Result(Binary),
    Error(String),
}

pub fn make_ack_success(count: u32, callback: bool) -> Binary {
    let ack = IncrementMsgAcknowledgement{
      count: count,
      callback: callback,
    };
    let res = Ack::Result(to_binary(&ack).unwrap());
    to_binary(&res).unwrap()
}

pub fn make_ack_fail(err: String) -> Binary {
    let res = Ack::Error(err);
    to_binary(&res).unwrap()
}

/// Return the data field for each message
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct IncrementMsgAcknowledgement {
    pub count: u32,
    pub callback: bool,
}
