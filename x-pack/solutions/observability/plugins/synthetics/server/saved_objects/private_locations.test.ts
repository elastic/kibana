/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PRIVATE_LOCATION_SAVED_OBJECT_TYPE } from './private_locations';

describe('PRIVATE_LOCATION_SAVED_OBJECT_TYPE', () => {
  it('is not available through the generic Saved Objects HTTP APIs', () => {
    expect(PRIVATE_LOCATION_SAVED_OBJECT_TYPE.hiddenFromHttpApis).toBe(true);
  });
});
