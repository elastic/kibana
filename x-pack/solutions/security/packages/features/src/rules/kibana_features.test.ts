/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_AI_INDEX_TYPES } from '../constants';
import type { SecurityFeatureParams } from '../security/types';
import { getRulesFeature, getRulesV2Feature, getRulesV3Feature, getRulesV4Feature } from '.';

const params: SecurityFeatureParams = {
  experimentalFeatures: {},
  savedObjects: [],
};

describe('Rules Kibana features', () => {
  it.each([
    ['v1', getRulesFeature],
    ['v2', getRulesV2Feature],
    ['v3', getRulesV3Feature],
    ['v4', getRulesV4Feature],
  ])('grants %s all and read privileges access to the rule SML types', (_, createFeature) => {
    const feature = createFeature(params).baseKibanaFeature;
    const expectedAiIndex = { read: [...RULES_AI_INDEX_TYPES] };

    expect(feature.privileges?.all.aiIndex).toEqual(expectedAiIndex);
    expect(feature.privileges?.read.aiIndex).toEqual(expectedAiIndex);
  });
});
