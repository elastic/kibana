/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@jest/globals';
import { getEnterpriseSearchNodeDeprecation } from './index'
import {ConfigType} from "@kbn/enterprise-search-plugin/server";

describe("Enterprise Search node deprecation", () => {

  it('Tells you to remove capacity if running on cloud', () => {
    const config = {host: 'example.com'} as ConfigType
    const deprecations = getEnterpriseSearchNodeDeprecation(config, true)
    expect(deprecations).toHaveLength(1)
    const steps = deprecations[0].correctiveActions.manualSteps
    expect(steps).toHaveLength(6)
    const stepsStr = steps.join(', ')
    expect(stepsStr).toMatch('Go to cloud.elastic.co')
    expect(stepsStr).toMatch('You should no longer see any Enterprise Search capacity')
  });

  it('Tells you to remove the config if running self-managed', () => {
    const config = {host: 'example.com'} as ConfigType
    const deprecations = getEnterpriseSearchNodeDeprecation(config, false)
    expect(deprecations).toHaveLength(1)
    const steps = deprecations[0].correctiveActions.manualSteps
    expect(steps).toHaveLength(4)
    const stepsStr = steps.join(', ')
    expect(stepsStr).toMatch('remove \'enterpriseSearch.host\'')
    expect(stepsStr).toMatch('Stop all your Enterprise Search nodes')
  });

  it('Has no deprecations if Enterprise Search is not there', () => {
    const config = {} as ConfigType
    const deprecations = getEnterpriseSearchNodeDeprecation(config, true)
    expect(deprecations).toHaveLength(0)
  })
})
