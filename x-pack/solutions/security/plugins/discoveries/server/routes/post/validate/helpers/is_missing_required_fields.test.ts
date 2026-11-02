/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { isMissingRequiredFields } from './is_missing_required_fields';

describe('isMissingRequiredFields', () => {
  it('returns true when _source is missing', () => {
    const hit = { _source: undefined } as unknown as estypes.SearchHit<Record<string, unknown>>;

    expect(isMissingRequiredFields(hit)).toBe(true);
  });

  it('returns false when required fields exist', () => {
    const hit = {
      _source: {
        'kibana.alert.attack_discovery.alert_ids': ['a'],
        'kibana.alert.attack_discovery.api_config': { connector_id: 'c', name: 'n' },
        'kibana.alert.attack_discovery.details_markdown': 'd',
        'kibana.alert.attack_discovery.summary_markdown': 's',
        'kibana.alert.attack_discovery.title': 't',
      },
    } as unknown as estypes.SearchHit<Record<string, unknown>>;

    expect(isMissingRequiredFields(hit)).toBe(false);
  });
});
