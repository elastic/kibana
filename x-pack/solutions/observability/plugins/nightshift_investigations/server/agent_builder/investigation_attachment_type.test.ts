/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentFormattedAttachment } from '@kbn/agent-builder-server/attachments';
import {
  DEDUCTIVE_INVESTIGATION_WORKFLOW_ID,
  getManagedWorkflowDefinition,
} from '@kbn/workflows/managed';
import type { NightshiftInvestigationAttachmentData } from '../../common/investigation_attachment';
import {
  NIGHTSHIFT_INVESTIGATION_ATTACHMENT_ID,
  NIGHTSHIFT_INVESTIGATION_ATTACHMENT_TYPE,
} from '../../common/investigation_attachment';
import {
  createInvestigationAttachmentType,
  formatInvestigationAsText,
} from './investigation_attachment_type';

const data: NightshiftInvestigationAttachmentData = {
  investigation_id: 'exec-1',
  state: {
    summary: 'Checkout latency tripled after the 14:02 deploy.',
    severity: '80-critical',
    conclusion: 'The deploy halved the connection pool.',
    hypotheses: [
      {
        candidate: 'Connection pool exhaustion',
        confidence: 0.9,
        status: 'confirmed',
        reason: 'Pool utilization saturates at 14:02.',
      },
      { candidate: 'Upstream vendor latency', confidence: 0.1, status: 'dismissed' },
    ],
    recommendations: [{ title: 'Roll back the deploy', confidence: 0.9 }],
    blind_spots: [
      {
        title: 'No profiling data',
        confidence: 0.7,
        description: 'Would have confirmed whether a leak compounded the exhaustion.',
      },
    ],
  },
};

const formatContext = { request: {} as KibanaRequest, spaceId: 'default' };

describe('nightshift investigation attachment type', () => {
  const attachmentType = createInvestigationAttachmentType();

  it('registers under the allow-listed type id', () => {
    expect(attachmentType.id).toBe(NIGHTSHIFT_INVESTIGATION_ATTACHMENT_TYPE);
  });

  // The YAML asset cannot import these constants, so drift between it and the attachment type
  // would leave the workflow writing findings nobody renders.
  it('matches the type and id the deductive workflow writes findings under', () => {
    const yaml = getManagedWorkflowDefinition(DEDUCTIVE_INVESTIGATION_WORKFLOW_ID)?.yaml ?? '';

    expect(yaml).toContain(`type: ${NIGHTSHIFT_INVESTIGATION_ATTACHMENT_TYPE}`);
    expect(yaml).toContain(`id: ${NIGHTSHIFT_INVESTIGATION_ATTACHMENT_ID}`);
    expect(yaml).toContain(`attachment_id: ${NIGHTSHIFT_INVESTIGATION_ATTACHMENT_ID}`);
  });

  it('is read-only, so only the workflow can write findings', () => {
    expect(attachmentType.isReadonly).toBe(true);
  });

  // Without this the inline card is never rendered, and the card is what carries the button that
  // opens the Canvas — so the findings would exist on the conversation but stay unreachable.
  it('tells the agent to render the attachment so the findings are reachable', () => {
    expect(attachmentType.getAgentDescription!()).toContain(
      `<render_attachment id="${NIGHTSHIFT_INVESTIGATION_ATTACHMENT_ID}"/>`
    );
  });

  describe('validate', () => {
    it('accepts the investigate step structured output', () => {
      expect(attachmentType.validate(data, formatContext)).toEqual({ valid: true, data });
    });

    it('accepts a minimal run that recorded no hypotheses yet', () => {
      const minimal = {
        investigation_id: 'exec-1',
        state: { summary: 'Starting.', hypotheses: [] },
      };

      expect(attachmentType.validate(minimal, formatContext)).toEqual({
        valid: true,
        data: minimal,
      });
    });

    it('rejects findings with no investigation to tie them to', () => {
      const { investigation_id: _, ...orphaned } = data;

      expect(attachmentType.validate(orphaned, formatContext)).toEqual({
        valid: false,
        error: expect.any(String),
      });
    });

    it('rejects a state that is not a valid investigation state', () => {
      const invalid = {
        investigation_id: 'exec-1',
        state: { summary: 'ok', hypotheses: [{ candidate: 'X', status: 'investigating' }] },
      };

      expect(attachmentType.validate(invalid, formatContext)).toEqual({
        valid: false,
        error: expect.any(String),
      });
    });
  });

  describe('format', () => {
    it('presents the findings to the agent as text', () => {
      const formatted = attachmentType.format(
        { id: 'a1', type: NIGHTSHIFT_INVESTIGATION_ATTACHMENT_TYPE, data },
        formatContext
      ) as AgentFormattedAttachment;

      expect(formatted.getRepresentation!()).toEqual({
        type: 'text',
        value: formatInvestigationAsText(data),
      });
    });
  });

  describe('formatInvestigationAsText', () => {
    it('includes the summary, conclusion, and every hypothesis with its confidence', () => {
      const text = formatInvestigationAsText(data);

      expect(text).toContain('Checkout latency tripled after the 14:02 deploy.');
      expect(text).toContain('The deploy halved the connection pool.');
      expect(text).toContain('[confirmed, 90%] Connection pool exhaustion');
      expect(text).toContain('[dismissed, 10%] Upstream vendor latency');
      expect(text).toContain('Roll back the deploy');
      expect(text).toContain('No profiling data');
    });

    it('omits sections the investigation never produced', () => {
      const text = formatInvestigationAsText({
        investigation_id: 'exec-1',
        state: { summary: 'Still looking.', hypotheses: [] },
      });

      expect(text).toContain('Still looking.');
      expect(text).not.toContain('Conclusion:');
      expect(text).not.toContain('Hypotheses:');
      expect(text).not.toContain('Recommendations:');
    });
  });
});
