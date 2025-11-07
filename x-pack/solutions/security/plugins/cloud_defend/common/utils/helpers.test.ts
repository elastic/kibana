/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSelectorsAndResponsesFromYaml, getYamlFromSelectorsAndResponses } from './helpers';
import { MOCK_YAML_CONFIGURATION, MOCK_YAML_INVALID_CONFIGURATION } from '../../public/test/mocks';

describe('getSelectorsAndResponsesFromYaml', () => {
  it('converts yaml into arrays of selectors and responses', () => {
    const { selectors, responses } = getSelectorsAndResponsesFromYaml(MOCK_YAML_CONFIGURATION);

    expect(selectors).toHaveLength(3);
    expect(responses).toHaveLength(2);
  });

  it('returns empty arrays if bad yaml', () => {
    const { selectors, responses } = getSelectorsAndResponsesFromYaml(
      MOCK_YAML_INVALID_CONFIGURATION
    );

    expect(selectors).toHaveLength(0);
    expect(responses).toHaveLength(0);
  });
});

describe('getYamlFromSelectorsAndResponses', () => {
  it('converts arrays of selectors and responses into yaml', () => {
    const { selectors, responses } = getSelectorsAndResponsesFromYaml(MOCK_YAML_CONFIGURATION);
    const yaml = getYamlFromSelectorsAndResponses(selectors, responses);
    expect(yaml).toEqual(MOCK_YAML_CONFIGURATION);
  });
});
