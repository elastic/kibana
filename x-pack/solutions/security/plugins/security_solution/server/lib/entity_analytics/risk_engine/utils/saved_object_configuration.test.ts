/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { riskScoreFieldMap } from '../../risk_score/configurations';
import { getDefaultRiskEngineConfiguration } from './saved_object_configuration';

describe('#getDefaultRiskEngineConfiguration', () => {
  it("please bump 'mappingsVersion' when mappings change", () => {
    const namespace = 'default';
    const config = getDefaultRiskEngineConfiguration({ namespace });

    expect(config._meta.mappingsVersion).toEqual(6);
    expect(riskScoreFieldMap).toMatchSnapshot();
  });
});
