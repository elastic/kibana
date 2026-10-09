/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildBlindSpotChatOptions,
  buildHypothesisChatOptions,
  buildRecommendationChatOptions,
} from './open_investigation_item_in_chat';

describe('open_investigation_item_in_chat', () => {
  it('buildBlindSpotChatOptions attaches the blind spot as text', () => {
    expect(
      buildBlindSpotChatOptions(
        {
          title: 'Missing trace coverage',
          description: 'No spans for payment gateway calls.',
        },
        'blind-spot-1'
      )
    ).toEqual({
      newConversation: true,
      autoSendInitialMessage: false,
      initialMessage: 'Tell me about this blind spot: Missing trace coverage',
      attachments: [
        {
          id: 'blind-spot-1',
          type: 'text',
          description: '[Blind spot] Missing trace coverage',
          data: {
            content: 'Missing trace coverage · No spans for payment gateway calls.',
          },
        },
      ],
    });
  });

  it('buildRecommendationChatOptions attaches the recommendation as text', () => {
    expect(
      buildRecommendationChatOptions(
        {
          title: 'Roll back checkout deployment',
          description: 'Revert commit abc123 and monitor error rate.',
        },
        'recommendation-1'
      )
    ).toEqual({
      newConversation: true,
      autoSendInitialMessage: false,
      initialMessage: 'Tell me about this recommendation: Roll back checkout deployment',
      attachments: [
        {
          id: 'recommendation-1',
          type: 'text',
          description: '[Recommendation] Roll back checkout deployment',
          data: {
            content: 'Roll back checkout deployment · Revert commit abc123 and monitor error rate.',
          },
        },
      ],
    });
  });

  it('buildHypothesisChatOptions attaches the hypothesis as text', () => {
    expect(
      buildHypothesisChatOptions(
        {
          candidate: 'Checkout deploy regression',
          reason: 'Error rate climbed after the deploy.',
        },
        'hypothesis-1'
      )
    ).toEqual({
      newConversation: true,
      autoSendInitialMessage: false,
      initialMessage: 'Tell me about this hypothesis: Checkout deploy regression',
      attachments: [
        {
          id: 'hypothesis-1',
          type: 'text',
          description: '[Hypothesis] Checkout deploy regression',
          data: {
            content: 'Checkout deploy regression · Error rate climbed after the deploy.',
          },
        },
      ],
    });
  });
});
