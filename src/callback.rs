use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use cosmwasm_std::{to_binary, StdResult, WasmMsg};

use crate::msg::ExecuteMsg;

// This is just a helper to properly serialize the above message
#[derive(Serialize, Deserialize, Clone, PartialEq, JsonSchema, Debug)]
#[serde(rename_all = "snake_case")]
pub enum CallbackMsg {
    // define the callback msg varient here if you need
}

pub fn build_callback(
    _count: u32,
    contract_addr: String,
    // callback_type: CallbackMsg,
) -> StdResult<WasmMsg> {

    let msg = ExecuteMsg::FirstIncrementCallback{};
    let msg = to_binary(&msg)?;

    Ok(WasmMsg::Execute {
        contract_addr: contract_addr,
        msg,
        funds: vec![],
    })
}
