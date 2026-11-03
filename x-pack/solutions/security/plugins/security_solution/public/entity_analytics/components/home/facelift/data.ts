/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stable import path for facelift mock entity data, so external call sites do
 * not hard-code the `./v9_1` folder. The shared corpus lives in `./mocks`.
 */

export * from './v9_1/data';
