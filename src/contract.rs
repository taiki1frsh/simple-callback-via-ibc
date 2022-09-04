#[cfg(not(feature = "library"))]
use cosmwasm_std::entry_point;
use cosmwasm_std::{
    to_binary, Binary, Deps, DepsMut, Env, IbcMsg, IbcTimeout, MessageInfo, Response, StdResult,
};
use cw2::set_contract_version;


use crate::error::ContractError;
use crate::msg::{ExecuteMsg, GetCountResponse, IbcExecuteMsg, InstantiateMsg, QueryMsg};
use crate::state::{CONNECTION_COUNTS, CALLBACK_COUNTER};

const CONTRACT_NAME: &str = "crates.io:cw-ibc-callback-example";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;
    Ok(Response::new().add_attribute("method", "instantiate"))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    deps: DepsMut,
    env: Env,
    _info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Increment { channel, callback } => Ok(Response::new()
            .add_attribute("method", "execute_increment")
            .add_attribute("channel", channel.clone())
            .add_message(IbcMsg::SendPacket {
                channel_id: channel,
                data: to_binary(&IbcExecuteMsg::Increment { callback })?,
                timeout: IbcTimeout::with_timestamp(env.block.time.plus_seconds(300)),
            })),
        ExecuteMsg::FirstIncrementCallback{ } => execute_ibc_callback(deps),
    }
}

pub fn execute_ibc_callback(
  deps: DepsMut,
) -> Result<Response, ContractError> {
  let count = CONNECTION_COUNTS.update(deps.storage, CALLBACK_COUNTER.to_string(), |count| -> StdResult<_> {
    Ok(count.unwrap_or_default() + 1)
  })?;

  Ok(Response::new()
    .add_attribute("method", "execute_ibc_callback")
    .add_attribute("count", count.to_string())
  )
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetCount { count } => to_binary(&query_count(deps, count)?),
    }
}

fn query_count(deps: Deps, counter: String) -> StdResult<GetCountResponse> {
    let count = CONNECTION_COUNTS
        .may_load(deps.storage, counter)?
        .unwrap_or_default();
    Ok(GetCountResponse { count })
}
