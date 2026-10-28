/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import type { HuntCoordinatorResult } from '@kbn/alertzero-common';
import {
  createHuntCoordinatorResultAttachmentType,
  HUNT_COORDINATOR_RESULT_ATTACHMENT_ID,
} from './hunt_coordinator_result';
import { emptyHuntForThreatResult } from '../../services/watches/hunt/tier1/hunt_for_threat';
import { formatToText } from './test_utils';

const fullResult: HuntCoordinatorResult = {
  status: 'tier1_only',
  report_id: 'report-1',
  run_id: 'run-1',
  index_patterns: ['logs-*'],
  tier2_targets: [],
  tier2_target_sources: [],
  report_intent_targets: [],
  actionable_indices: [],
  tier1: {
    tier: 1,
    ...emptyHuntForThreatResult('no_environment_hits', [], [], { from: 'now-7d', to: 'now' }, ''),
  },
  message: 'no hits',
  next_step: 'stop',
  has_confirmed_hit: false,
  completeness: 'complete',
  completed_successfully: true,
  headline: 'no confirmed hits: Tier 1 found no matches; Tier 2 skipped',
  narrative: 'Hunt Watch found no confirmed hits for threat report report-1.',
};

const running = { run_id: 'run-1', report_id: 'report-1', state: 'running' };
const completed = {
  run_id: 'run-1',
  report_id: 'report-1',
  state: 'completed',
  result: fullResult,
};
const failed = {
  run_id: 'run-1',
  report_id: 'report-1',
  state: 'failed',
  error: { message: 'Hunt coordinator failed' },
};

describe('createHuntCoordinatorResultAttachmentType', () => {
  const attachmentType = createHuntCoordinatorResultAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  it('registers under the security.hunt_coordinator_result attachment id', () => {
    expect(HUNT_COORDINATOR_RESULT_ATTACHMENT_ID).toBe('security.hunt_coordinator_result');
    expect(attachmentType.id).toBe('security.hunt_coordinator_result');
  });

  it('is readonly so the agent cannot create or update one through the attachment tools', () => {
    expect(attachmentType.isReadonly).toBe(true);
  });

  it('has no agent description', () => {
    expect(attachmentType.getAgentDescription).toBeUndefined();
  });

  describe('validate', () => {
    it.each([
      ['running placeholder without a result', running],
      ['completed envelope with the full result', completed],
      ['failed envelope with a message', failed],
    ])('accepts a %s', async (_label, input) => {
      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('accepts an envelope without a report_id', async () => {
      const result = await attachmentType.validate({ run_id: 'run-1', state: 'running' });

      expect(result.valid).toBe(true);
    });

    // Route tests mock the attachment client; this locks the enriched write shape.
    it('accepts the enriched completed shape the route stores on a confirmed hit', async () => {
      const enriched: HuntCoordinatorResult = {
        ...fullResult,
        status: 'tier1_and_tier2',
        has_confirmed_hit: true,
        sse: [
          {
            attachment_id: 'sse-report-1-T1078.004',
            data: {
              type: 'security.significant_security_event',
              run_id: 'run-1',
              hunt_result: { nested: true },
            },
          },
        ],
        impacted_entities: [{ id: 'host:web-1', name: 'web-1', type: 'host' }],
      };
      const result = await attachmentType.validate({
        run_id: 'run-1',
        report_id: 'report-1',
        state: 'completed',
        result: enriched,
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual({
          run_id: 'run-1',
          report_id: 'report-1',
          state: 'completed',
          result: enriched,
        });
      }
    });

    it.each([
      ['completed envelope without a result', { ...running, state: 'completed' }],
      ['failed envelope without an error', { ...running, state: 'failed' }],
      ['unknown state', { ...running, state: 'pending' }],
      ['status in place of state', { run_id: 'run-1', status: 'running' }],
      ['running envelope with an extra key', { ...running, result: fullResult }],
      ['completed envelope with an extra key', { ...completed, extra: true }],
      ['failed envelope with an empty message', { ...failed, error: { message: '' } }],
      ['missing run_id', { state: 'running' }],
    ])('rejects a %s', async (_label, input) => {
      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('format', () => {
    it.each([
      ['running', running],
      ['completed', completed],
      ['failed', failed],
    ])(
      'renders one line naming the run and its %s state, never the result',
      async (state, input) => {
        const value = await formatToText(attachmentType, formatContext, input);

        expect(value).toBe(
          `Hunt coordinator result for run run-1: ${state}. Internal workflow state, not analyst content.`
        );
        expect(value).not.toContain('\n');
        expect(value).not.toContain(fullResult.narrative);
        expect(value).not.toContain('render_attachment');
      }
    );

    it('throws a message naming the attachment id when the data is invalid', () => {
      expect(() =>
        attachmentType.format(
          { id: 'att-1', type: HUNT_COORDINATOR_RESULT_ATTACHMENT_ID, data: { nope: true } },
          formatContext
        )
      ).toThrow('Invalid security.hunt_coordinator_result attachment data for attachment att-1');
    });
  });
});
