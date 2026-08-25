/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared mock corpus for facelift v.5.
 *
 * UI under `./` is an independent snapshot (copy of v.4) so engineers can take
 * that page code forward. Mock entities / hits stay single-sourced from v.2
 * `data.ts` — do not duplicate IDENTITIES / RAW_RECORDS here.
 *
 * To detach v.5 later: replace this re-export with a local copy of `../v2/data`
 * (or a shared `../shared/data` module) and keep importing from `./data`.
 */

export * from '../v2/data';
