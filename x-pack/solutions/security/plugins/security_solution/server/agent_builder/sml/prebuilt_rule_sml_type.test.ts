/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PREBUILT_RULE_SML_TYPE } from '@kbn/security-solution-features/constants';
import { createPrebuiltRuleSmlType } from './prebuilt_rule_sml_type';

const createType = (fetchFrequency?: string) =>
  createPrebuiltRuleSmlType({
    fetchFrequency,
    getSavedObjectsClient: jest.fn(),
    getSpaceIds: jest.fn(),
  });

describe('prebuilt rule SML type', () => {
  it('keeps the production crawl cadence by default', () => {
    expect(createType().fetchFrequency?.()).toBe('60m');
  });

  it('allows development to use a shorter crawl cadence', () => {
    expect(createType('1m').fetchFrequency?.()).toBe('1m');
  });

  it('requires Rules feature read access', async () => {
    expect(await createType().getPermissions?.('rule-1', {} as never)).toEqual({
      kibana: {
        privileges: { name: [`ai_index:${PREBUILT_RULE_SML_TYPE}/read`] },
      },
    });
  });
});
