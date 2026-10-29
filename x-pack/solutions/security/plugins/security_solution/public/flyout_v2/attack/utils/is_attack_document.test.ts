/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { isAttackDocument } from './is_attack_document';

const createHit = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: { _id: '1', _index: 'test', _source: {} },
    flattened,
    isAnchor: false,
  } as DataTableRecord);

describe('isAttackDocument', () => {
  it('returns true for a scheduled attack discovery alert', () => {
    expect(
      isAttackDocument(
        createHit({
          'event.kind': 'signal',
          'kibana.alert.rule.rule_type_id': 'attack-discovery',
        })
      )
    ).toBe(true);
  });

  it('returns true for an ad-hoc attack discovery alert', () => {
    expect(
      isAttackDocument(
        createHit({
          'event.kind': 'signal',
          'kibana.alert.rule.rule_type_id': 'attack_discovery_ad_hoc_rule_type_id',
        })
      )
    ).toBe(true);
  });

  it('returns false for a regular detection alert (signal, non-attack rule type)', () => {
    expect(
      isAttackDocument(
        createHit({
          'event.kind': 'signal',
          'kibana.alert.rule.rule_type_id': 'siem.queryRule',
        })
      )
    ).toBe(false);
  });

  it('returns false when the attack rule type id is present but event.kind is not signal', () => {
    expect(
      isAttackDocument(
        createHit({
          'event.kind': 'event',
          'kibana.alert.rule.rule_type_id': 'attack-discovery',
        })
      )
    ).toBe(false);
  });

  it('returns false for a plain event document', () => {
    expect(isAttackDocument(createHit({ 'event.kind': 'event' }))).toBe(false);
  });
});
