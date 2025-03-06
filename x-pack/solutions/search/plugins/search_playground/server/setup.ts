/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// webstream-polyfill doesn't fully support the whole spec. This is a workaround to rely on node native streaming support.
// see /kibana/src/platform/packages/shared/kbn-test/src/jest/setup/setup_test.js
const webStream = jest.requireActual('node:stream/web');

Object.assign(global, webStream);
