/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * WASM-safe adapters for YARA hash-table free callbacks.
 *
 * YARA casts `void yr_object_destroy(YR_OBJECT*)` to `int (*)(void*)`
 * (YR_HASH_TABLE_FREE_VALUE_FUNC). That is undefined behavior that happens to
 * work on native ABIs, but WebAssembly enforces exact call_indirect signatures
 * and traps with:
 *   RuntimeError: null function or function signature mismatch
 *
 * These adapters match the expected `(void*) -> int` signature.
 */

#ifndef YARA_WASM_HASH_TABLE_FREE_ADAPTERS_H
#define YARA_WASM_HASH_TABLE_FREE_ADAPTERS_H

#include <yara/object.h>

static int yr_wasm_object_destroy_free(void* value)
{
  yr_object_destroy((YR_OBJECT*) value);
  return 0;
}

#endif
