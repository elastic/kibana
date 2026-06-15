/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License 2.0.
 */

import { parseServerlessSlackMessage, parseServerlessSlackMessages } from './parse_serverless_slack_messages';

describe('parseServerlessSlackMessages', () => {
  it('parses deploy tag announcements', () => {
    const events = parseServerlessSlackMessage({
      text: 'Deploy tag deploy@2026-05-30T12:00:00Z successfully created for kibana serverless release.',
      channelName: 'kibana-mission-control',
      messageTs: '1717000000.000100',
      permalink: 'https://elastic.slack.com/archives/C123/p1717000000000100',
    });

    expect(events).toEqual([
      expect.objectContaining({
        releaseLine: 'serverless',
        product: 'kibana',
        version: 'deploy@2026-05-30T12:00:00Z',
        milestone: 'deploy',
        status: 'completed',
      }),
    ]);
  });

  it('parses QA promotion messages with version numbers', () => {
    const events = parseServerlessSlackMessage({
      text: 'Kibana serverless release 9.2.0 promoted to QA.',
      channelName: 'kibana-mission-control',
      messageTs: '1717000001.000100',
    });

    expect(events).toEqual([
      expect.objectContaining({
        version: '9.2.0',
        milestone: 'qa_promotion',
        status: 'announced',
      }),
    ]);
  });

  it('parses branch cut and feature freeze messages', () => {
    const events = parseServerlessSlackMessages([
      {
        text: 'Kibana branch cut completed for 9.3.0.',
        messageTs: '1717000002.000100',
      },
      {
        text: 'Feature freeze started for Kibana 9.3.0.',
        messageTs: '1717000003.000100',
      },
    ]);

    expect(events.map((event) => event.milestone)).toEqual(['branch_cut', 'feature_freeze']);
  });

  it('ignores unrelated channel chatter', () => {
    const events = parseServerlessSlackMessage({
      text: 'Reminder: standup in 10 minutes.',
      messageTs: '1717000004.000100',
    });

    expect(events).toEqual([]);
  });
});
