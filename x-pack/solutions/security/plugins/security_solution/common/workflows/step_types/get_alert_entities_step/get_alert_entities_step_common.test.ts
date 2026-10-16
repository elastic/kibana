/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepCategory } from '@kbn/workflows';
import { MAX_ALERT_IDS } from '../common/constants';
import {
  getAlertEntitiesInputSchema,
  getAlertEntitiesOutputSchema,
  getAlertEntitiesStepCommonDefinition,
} from './get_alert_entities_step_common';

describe('getAlertEntitiesInputSchema', () => {
  it('defaults to hosts and users, at most 50 entities', () => {
    expect(getAlertEntitiesInputSchema.parse({ alert_ids: ['a'] })).toEqual({
      alert_ids: ['a'],
      entity_types: ['host', 'user'],
      max_entities: 50,
    });
  });

  // `${{ }}` delivers a number; a `{{ }}` template or a quoted literal delivers a string.
  it('coerces a max_entities that arrives as a string', () => {
    expect(getAlertEntitiesInputSchema.parse({ alert_ids: ['a'], max_entities: '20' })).toEqual(
      expect.objectContaining({ max_entities: 20 })
    );
  });

  it('accepts services', () => {
    expect(
      getAlertEntitiesInputSchema.parse({ alert_ids: ['a'], entity_types: ['service'] })
    ).toEqual(expect.objectContaining({ entity_types: ['service'] }));
  });

  it.each([
    ['no alert ids', { alert_ids: [] }],
    ['an empty alert id', { alert_ids: [''] }],
    ['an oversized alert id', { alert_ids: ['a'.repeat(257)] }],
    [
      'too many alert ids',
      { alert_ids: Array.from({ length: MAX_ALERT_IDS + 1 }, (_, i) => `${i}`) },
    ],
    ['an unknown entity type', { alert_ids: ['a'], entity_types: ['generic'] }],
    ['no entity types', { alert_ids: ['a'], entity_types: [] }],
    // A repeated type would return each of its entities twice and double count the total.
    ['a repeated entity type', { alert_ids: ['a'], entity_types: ['host', 'host'] }],
    [
      'more entity types than there are',
      { alert_ids: ['a'], entity_types: ['host', 'user', 'service', 'host'] },
    ],
    ['a zero cap', { alert_ids: ['a'], max_entities: 0 }],
    ['a cap above the limit', { alert_ids: ['a'], max_entities: 101 }],
    ['a fractional cap', { alert_ids: ['a'], max_entities: 1.5 }],
  ])('rejects %s', (_label, input) => {
    expect(getAlertEntitiesInputSchema.safeParse(input).success).toBe(false);
  });

  it('accepts the most alert ids it allows', () => {
    const alertIds = Array.from({ length: MAX_ALERT_IDS }, (_, i) => `${i}`);

    expect(getAlertEntitiesInputSchema.safeParse({ alert_ids: alertIds }).success).toBe(true);
  });
});

describe('getAlertEntitiesStepCommonDefinition', () => {
  it('is listed with the other Security steps', () => {
    expect(getAlertEntitiesStepCommonDefinition.category).toBe(StepCategory.KibanaSecurity);
  });

  // `investigations.attachImpact` rejects an empty `entities`, which alerts with no host or
  // user produce.
  it('guards the documented attach against an empty result', () => {
    expect(getAlertEntitiesStepCommonDefinition.documentation?.examples?.[0]).toContain(
      'if: "${{ steps.get_alert_entities.output.entities != blank }}"'
    );
  });

  it('says the output can be attached only when it is not empty', () => {
    expect(getAlertEntitiesStepCommonDefinition.documentation?.details).toContain(
      'as it is, when it is not empty'
    );
  });
});

describe('getAlertEntitiesOutputSchema', () => {
  it('accepts an entity with and without a name', () => {
    expect(
      getAlertEntitiesOutputSchema.safeParse({
        entities: [
          { id: 'host:a', name: 'a', type: 'host' },
          { id: 'user:b@a@local', type: 'user' },
        ],
        total: 2,
        truncated: false,
      }).success
    ).toBe(true);
  });

  it('rejects an empty name, which the impact attach would reject', () => {
    expect(
      getAlertEntitiesOutputSchema.safeParse({
        entities: [{ id: 'host:a', name: '', type: 'host' }],
        total: 1,
        truncated: false,
      }).success
    ).toBe(false);
  });
});
