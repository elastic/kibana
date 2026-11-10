/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TinesLink, TinesStoryExport } from './tines.gen';

describe('Tines story schemas', () => {
  const agent = {
    type: 'Agents::WebhookAgent',
    name: 'Receive events',
    guid: 'agent-1',
  };

  it('accepts a story export with agents and links', () => {
    const parsed = TinesStoryExport.safeParse({
      name: 'Simple story',
      description: null,
      agents: [agent],
      links: [{ source: 0, receiver: 0, link_type: 'primary' }],
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects a link with a negative source index', () => {
    expect(TinesLink.safeParse({ source: -1, receiver: 0 }).success).toBe(false);
  });

  it('rejects a story without agents', () => {
    expect(TinesStoryExport.safeParse({ name: 'Empty', agents: [] }).success).toBe(false);
  });
});
