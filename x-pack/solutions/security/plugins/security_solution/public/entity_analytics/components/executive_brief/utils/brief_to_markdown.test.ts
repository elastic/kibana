/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FIXTURE_JOB_SUCCEEDED } from '../../../../../common/entity_analytics/executive_brief/__fixtures__/brief';
import { briefToMarkdown } from './brief_to_markdown';

describe('briefToMarkdown', () => {
  it('renders every section with resolved names', () => {
    const markdown = briefToMarkdown(FIXTURE_JOB_SUCCEEDED);

    expect(markdown).toContain('## At a glance');
    expect(markdown).toContain('## Storylines');
    expect(markdown).toContain('## Blind spots');
    expect(markdown).toContain('## Decisions');
    expect(markdown).toContain('a.rodriguez');
    expect(markdown).toContain('Lateral Movement: 6 alerts, 1/2 rules working - Limited coverage');
  });

  it('returns an empty string for a job without a brief', () => {
    expect(briefToMarkdown({ ...FIXTURE_JOB_SUCCEEDED, brief: undefined })).toBe('');
  });
});
