/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { updateRuleInputSchema } from './update_rule_step_common';

const RULE_ID = '11111111-1111-4111-8111-111111111111';

describe('updateRuleInputSchema', () => {
  it.each([
    ['query', { update: { type: 'query', id: RULE_ID, query: 'host.name: *' } }],
    [
      'threshold',
      {
        update: {
          type: 'threshold',
          rule_id: 'r-1',
          threshold: { field: ['host.name'], value: 200 },
        },
      },
    ],
    ['esql', { update: { type: 'esql', id: RULE_ID, query: 'FROM logs-* | LIMIT 10' } }],
    ['threat_match', { update: { type: 'threat_match', rule_id: 'r-2', threat_index: ['ti-*'] } }],
    ['eql', { update: { type: 'eql', id: RULE_ID, query: 'process where true' } }],
    [
      'machine_learning',
      { update: { type: 'machine_learning', id: RULE_ID, anomaly_threshold: 70 } },
    ],
    ['new_terms', { update: { type: 'new_terms', id: RULE_ID, new_terms_fields: ['user.name'] } }],
    ['saved_query', { update: { type: 'saved_query', id: RULE_ID, saved_id: 'so-1' } }],
  ])('accepts a partial %s rule patch', (_type, input) => {
    const result = updateRuleInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects an unknown type value', () => {
    const result = updateRuleInputSchema.safeParse({
      update: { type: 'nonsense', id: RULE_ID, query: 'x' },
    });
    expect(result.success).toBe(false);
  });

  it('is a plain union of real zod objects', () => {
    const ruleSchema = updateRuleInputSchema.shape.update;
    // Check that schema is a normal union and not a proxy – otherwise autocomplete
    // and editor validation don't work.
    expect(ruleSchema).toBeInstanceOf(z.ZodUnion);
    expect((ruleSchema as z.ZodUnion).options[0]).toBeInstanceOf(z.ZodObject);
    // Check that schema is not a discriminated union – otherwise the editor pre-fills `type: ""`,
    // although "type" is optional.
    expect(ruleSchema).not.toBeInstanceOf(z.ZodDiscriminatedUnion);
  });
});
