/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syntheticsParamSavedObjectType } from './synthetics_param';

describe('syntheticsParamSavedObjectType', () => {
  it('is not available through the generic Saved Objects HTTP APIs', () => {
    expect(syntheticsParamSavedObjectType.hiddenFromHttpApis).toBe(true);
  });
});
