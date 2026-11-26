/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deanonymizeDiscoveries } from './deanonymize_discoveries';

describe('deanonymizeDiscoveries', () => {
  const replacements = { 'tok-user': 'alice', 'tok-host': 'web-1' };
  const base = {
    alertIds: ['a1'],
    timestamp: 't',
    title: 'tok-user on tok-host',
    summaryMarkdown: '{{ user.name tok-user }}',
    detailsMarkdown: '{{ host.name tok-host }}',
  };

  it('restores original values in title, summary, details and entity summary', () => {
    const [result] = deanonymizeDiscoveries(
      [{ ...base, entitySummaryMarkdown: '{{ user.name tok-user }}' }],
      replacements
    );
    expect(result.title).toBe('alice on web-1');
    expect(result.summaryMarkdown).toBe('{{ user.name alice }}');
    expect(result.detailsMarkdown).toBe('{{ host.name web-1 }}');
    expect(result.entitySummaryMarkdown).toBe('{{ user.name alice }}');
    expect(result.alertIds).toEqual(['a1']);
  });

  it('leaves an absent entity summary absent', () => {
    expect('entitySummaryMarkdown' in deanonymizeDiscoveries([base], replacements)[0]).toBe(false);
  });
});
