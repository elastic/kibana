/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEventType } from '@kbn/agent-builder-common';
import { formatInvestigationStory } from './format_story';

describe('formatInvestigationStory', () => {
  it('keeps journal notes, comments, and added attachments, in time order', () => {
    const story = formatInvestigationStory({
      events: [
        {
          type: TimelineEventType.attachmentAdded,
          created_at: '2026-10-06T00:02:00.000Z',
          data: { attachment_id: 'att-1', attachment_type: 'security.threat' },
        },
        {
          type: TimelineEventType.executionStep,
          created_at: '2026-10-06T00:03:00.000Z',
          data: { step: { type: 'tool_call' } },
        },
        {
          type: 'text_note',
          created_at: '2026-10-06T00:01:00.000Z',
          data: { title: 'Scope', text: 'Only the finance hosts.' },
        },
        {
          type: TimelineEventType.userMessage,
          created_at: '2026-10-06T00:00:00.000Z',
          data: { message: 'Okta rule fired for the admin.' },
        },
      ],
      attachments: [
        {
          id: 'att-1',
          type: 'security.threat',
          description: 'Diamond model for the Okta session',
          current_version: 1,
          versions: [{ version: 1, data: {} }],
        },
      ],
    });

    expect(story).toBe(
      [
        'User: Okta rule fired for the admin.',
        'Comment: Scope\nOnly the finance hosts.',
        'Attachment added (security.threat): Diamond model for the Okta session',
      ].join('\n\n')
    );
  });

  it('skips hidden attachments and empty notes', () => {
    expect(
      formatInvestigationStory({
        events: [
          {
            type: TimelineEventType.attachmentAdded,
            created_at: '2026-10-06T00:00:00.000Z',
            data: { attachment_id: 'hidden', attachment_type: 'text' },
          },
          {
            type: TimelineEventType.userMessage,
            created_at: '2026-10-06T00:01:00.000Z',
            data: { message: '   ' },
          },
        ],
        attachments: [{ id: 'hidden', type: 'text', hidden: true }],
      })
    ).toBe('');
  });
});
