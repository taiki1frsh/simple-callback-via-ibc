#!/bin/bash

# compile contract to wasm binaryies
cargo wasm

# optimize wasm
docker run --rm -v "$(pwd)":/code \
  --mount type=volume,source="$(basename "$(pwd)")_cache",target=/code/target \
  --mount type=volume,source=registry_cache,target=/usr/local/cargo/registry \
  cosmwasm/rust-optimizer-arm64:0.12.6

# generate ts codes using ts-codegen using schema
cosmwasm-ts-codegen generate \
  --plugin client \
  --schema ./schema \
  --out ./tests/src \
  --name SimpleIbcCallback \
