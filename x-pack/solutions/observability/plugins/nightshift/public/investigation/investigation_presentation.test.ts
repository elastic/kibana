/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationState } from '@kbn/significant-events-schema';
import {
  getConclusionBody,
  getHypothesisStatusLabel,
  getInvestigationCompleteStatusLabel,
  getInvestigationHeadline,
  getInvestigationWorkflowStatusLabel,
  getPrimaryHypothesis,
  mapBlindSpots,
  parseInvestigationRecommendations,
  sortInvestigationHypotheses,
} from './investigation_presentation';

const completeState: InvestigationState = {
  summary: 'Investigate latency spike on web-frontend.',
  hypotheses: [
    {
      candidate: 'Deployment regression in checkout service',
      confidence: 0.92,
      status: 'confirmed',
      reason: 'Error rate rose after deploy.',
    },
    {
      candidate: 'Upstream dependency timeout',
      confidence: 0.41,
      status: 'dismissed',
      reason: 'No dependency latency increase observed.',
    },
  ],
  conclusion: `# Conclusion
Checkout deploy introduced a regression.

## Next Steps
- Roll back checkout deployment · Revert commit abc123 and monitor error rate.
- Add canary deploy guardrail · Block deploys when error rate exceeds baseline.`,
  gaps_found: [
    'Missing trace coverage · No spans for payment gateway calls.',
    'Limited log retention · Request IDs older than 24h unavailable.',
  ],
};

describe('investigation_presentation', () => {
  describe('getInvestigationWorkflowStatusLabel', () => {
    it('returns workflow labels for each investigation status', () => {
      expect(getInvestigationWorkflowStatusLabel('complete')).toBe('Investigated');
      expect(getInvestigationWorkflowStatusLabel('running')).toBe('Investigating');
      expect(getInvestigationWorkflowStatusLabel('failed')).toBe('Investigation failed');
      expect(getInvestigationWorkflowStatusLabel('unavailable')).toBe('Investigation unavailable');
      expect(getInvestigationWorkflowStatusLabel('loading')).toBe('Loading investigation');
    });
  });

  describe('getInvestigationCompleteStatusLabel', () => {
    it('returns Complete for the investigation flyout badge', () => {
      expect(getInvestigationCompleteStatusLabel()).toBe('Complete');
    });
  });

  describe('getPrimaryHypothesis', () => {
    it('prefers investigating, then confirmed, then first hypothesis', () => {
      expect(
        getPrimaryHypothesis([
          { candidate: 'Dismissed cause', confidence: 0.2, status: 'dismissed' },
          { candidate: 'Confirmed cause', confidence: 0.9, status: 'confirmed' },
        ])?.candidate
      ).toBe('Confirmed cause');

      expect(
        getPrimaryHypothesis([
          { candidate: 'Investigating cause', confidence: 0.5, status: 'investigating' },
          { candidate: 'Confirmed cause', confidence: 0.9, status: 'confirmed' },
        ])?.candidate
      ).toBe('Investigating cause');
    });
  });

  describe('getInvestigationHeadline', () => {
    it('uses confirmed hypothesis candidate when complete', () => {
      expect(
        getInvestigationHeadline({
          eventTitle: 'Latency spike',
          state: completeState,
          status: 'complete',
        })
      ).toBe('Deployment regression in checkout service');
    });

    it('falls back to event title when no state is available', () => {
      expect(
        getInvestigationHeadline({
          eventTitle: 'Latency spike',
          status: 'loading',
        })
      ).toBe('Latency spike');
    });
  });

  describe('sortInvestigationHypotheses', () => {
    it('sorts hypotheses by confidence descending', () => {
      expect(
        sortInvestigationHypotheses([
          { candidate: 'Low confidence', confidence: 0.15, status: 'investigating' },
          { candidate: 'High confidence', confidence: 0.7, status: 'investigating' },
          { candidate: 'Medium confidence', confidence: 0.2, status: 'dismissed' },
        ]).map(({ candidate }) => candidate)
      ).toEqual(['High confidence', 'Medium confidence', 'Low confidence']);
    });
  });

  describe('parseInvestigationRecommendations', () => {
    it('parses next steps bullets from the conclusion markdown', () => {
      expect(parseInvestigationRecommendations(completeState)).toEqual([
        {
          title: 'Roll back checkout deployment',
          description: 'Revert commit abc123 and monitor error rate.',
        },
        {
          title: 'Add canary deploy guardrail',
          description: 'Block deploys when error rate exceeds baseline.',
        },
      ]);
    });

    it('keeps em-dash bullets intact and attaches code blocks to the preceding bullet', () => {
      const state: InvestigationState = {
        summary: 'Investigate api-gateway latency.',
        hypotheses: [
          {
            candidate: 'Auth middleware regression',
            confidence: 0.92,
            status: 'confirmed',
          },
          {
            candidate: 'Downstream dependency timeout',
            confidence: 0.5,
            status: 'dismissed',
          },
        ],
        conclusion: `# Conclusion
Auth middleware blocks on DB lookups.

## Next Steps
- **Immediate mitigation** — roll back api-gateway to v2.8.0:**
\`\`\`shell
kubectl rollout undo deployment/api-gateway
kubectl rollout status deployment/api-gateway
\`\`\`
- Verify auth middleware recovery — confirm 200 responses resume and 5xx rate drops to zero:
- Monitor web-frontend latency recovery — P95 should return to ~480ms within 5–10 minutes of gateway recovery:`,
      };

      expect(parseInvestigationRecommendations(state)).toEqual([
        {
          title: '**Immediate mitigation** — roll back api-gateway to v2.8.0',
          code: 'kubectl rollout undo deployment/api-gateway\nkubectl rollout status deployment/api-gateway',
        },
        {
          title:
            'Verify auth middleware recovery — confirm 200 responses resume and 5xx rate drops to zero',
          code: undefined,
        },
        {
          title:
            'Monitor web-frontend latency recovery — P95 should return to ~480ms within 5–10 minutes of gateway recovery',
          code: undefined,
        },
      ]);
    });
  });

  describe('mapBlindSpots', () => {
    it('splits title and description on middle dot separators', () => {
      expect(mapBlindSpots(completeState.gaps_found)).toEqual([
        {
          title: 'Missing trace coverage',
          description: 'No spans for payment gateway calls.',
        },
        {
          title: 'Limited log retention',
          description: 'Request IDs older than 24h unavailable.',
        },
      ]);
    });
  });

  describe('getConclusionBody', () => {
    it('extracts the conclusion section body from markdown', () => {
      expect(getConclusionBody(completeState.conclusion)).toBe(
        'Checkout deploy introduced a regression.'
      );
    });
  });

  describe('getHypothesisStatusLabel', () => {
    it('maps hypothesis statuses to labels', () => {
      expect(getHypothesisStatusLabel('investigating')).toBe('Checking');
      expect(getHypothesisStatusLabel('confirmed')).toBe('Confirmed');
      expect(getHypothesisStatusLabel('dismissed')).toBe('Rejected');
    });
  });
});
