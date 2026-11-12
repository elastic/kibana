/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery } from '@kbn/elastic-assistant-common';
import { getDiscoveryMarkdown, parseFieldTokens } from './discovery_text';

describe('parseFieldTokens', () => {
  it('extracts field and value from {{ field value }} tokens', () => {
    expect(
      parseFieldTokens(
        '{{ user.name alice }} used {{ source.ip 203.0.113.50 }} and {{host.name web 1}}'
      )
    ).toEqual([
      { field: 'user.name', value: 'alice' },
      { field: 'source.ip', value: '203.0.113.50' },
      { field: 'host.name', value: 'web 1' },
    ]);
  });

  it('ignores plain prose', () => {
    expect(parseFieldTokens('alice used 203.0.113.50')).toEqual([]);
  });
});

describe('getDiscoveryMarkdown', () => {
  it('joins the markdown fields and skips empty ones', () => {
    const discovery = {
      title: 'Title only text',
      alertIds: [],
      summaryMarkdown: 'summary',
      detailsMarkdown: 'details',
      entitySummaryMarkdown: '',
      timestamp: 't',
    } as AttackDiscovery;
    expect(getDiscoveryMarkdown(discovery)).toBe('summary\ndetails');
  });
});
