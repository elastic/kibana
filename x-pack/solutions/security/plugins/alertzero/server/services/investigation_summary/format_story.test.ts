/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEventType } from '@kbn/agent-builder-common';
import {
  collectProposalIds,
  collectStoryProposalIds,
  formatInvestigationStory,
} from './format_story';

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

  describe('proposals', () => {
    const events = [
      {
        type: TimelineEventType.attachmentAdded,
        created_at: '2026-10-06T00:00:00.000Z',
        data: { attachment_id: 'att-1', attachment_type: 'platform.proposal' },
      },
    ];
    const attachments = [
      {
        id: 'att-1',
        type: 'platform.proposal',
        origin: 'prop-1',
        current_version: 1,
        versions: [{ version: 1, data: { proposalId: 'prop-1', title: 'Review detection gap' } }],
      },
    ];

    it('tells a proposal by its content, with the decision when there is one', () => {
      const story = formatInvestigationStory({
        events,
        attachments,
        proposals: {
          'prop-1': {
            title: 'Review detection gap',
            status: 'succeeded',
            decision: 'approved',
            comment: '  No rule covers payroll account changes.  ',
          },
        },
      });

      expect(story).toBe(
        'Proposal: Review detection gap (status: succeeded, decision: approved)\nNo rule covers payroll account changes.'
      );
    });

    it('does not mention the state of a proposal that has no decision', () => {
      const story = formatInvestigationStory({
        events,
        attachments,
        proposals: {
          'prop-1': { title: 'Review detection gap', status: 'pending', comment: 'Why.' },
        },
      });

      expect(story).toBe('Proposal: Review detection gap\nWhy.');
    });

    it('tells an expired proposal by its status even though it has no decision', () => {
      const story = formatInvestigationStory({
        events,
        attachments,
        proposals: {
          'prop-1': { title: 'Review detection gap', status: 'expired', comment: 'Why.' },
        },
      });

      expect(story).toBe('Proposal: Review detection gap (status: expired)\nWhy.');
    });

    it('does not tell the status of a proposal that can still change', () => {
      const story = formatInvestigationStory({
        events,
        attachments,
        proposals: { 'prop-1': { title: 'Review detection gap', status: 'executing' } },
      });

      expect(story).toBe('Proposal: Review detection gap');
    });

    it('clips a long proposal comment', () => {
      const story = formatInvestigationStory({
        events,
        attachments,
        proposals: {
          'prop-1': { title: 'T', status: 'pending', comment: 'a'.repeat(5_000) },
        },
      });

      expect(story).toBe(`Proposal: T\n${'a'.repeat(1_500)}`);
    });

    it('leaves out a superseded proposal, whose replacement tells the story', () => {
      expect(
        formatInvestigationStory({
          events,
          attachments,
          proposals: {
            'prop-1': { title: 'T', status: 'superseded', supersededBy: 'prop-2', comment: 'Old.' },
          },
        })
      ).toBe('');
      expect(
        formatInvestigationStory({
          events,
          attachments,
          proposals: { 'prop-1': { title: 'T', status: 'superseded' } },
        })
      ).toBe('');
    });

    it('tells a proposal by its label when its content is not available', () => {
      expect(formatInvestigationStory({ events, attachments })).toBe(
        'Attachment added (platform.proposal): Review detection gap'
      );
    });

    it('collects only the proposals an attachment event added', () => {
      expect(
        collectStoryProposalIds({
          events,
          attachments: [
            ...attachments,
            { id: 'att-2', type: 'platform.proposal', origin: 'prop-2' },
          ],
        })
      ).toEqual(['prop-1']);
    });

    it('collects each visible proposal id once', () => {
      expect(
        collectProposalIds([
          ...attachments,
          { ...attachments[0], id: 'att-2' },
          { ...attachments[0], id: 'att-3', origin: 'prop-3', hidden: true },
          { id: 'att-4', type: 'text' },
        ])
      ).toEqual(['prop-1']);
    });
  });
});
