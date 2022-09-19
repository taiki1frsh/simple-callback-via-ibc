use cosmwasm_std::{to_binary, StdResult, WasmMsg};

use crate::msg::ExecuteMsg;

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
