/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentFormattedAttachment,
  AttachmentFormatContext,
} from '@kbn/agent-builder-server/attachments';

import { ATTACK_DISCOVERY_VERDICT_ATTACHMENT_TYPE } from '../../../../common/constants';
import { createAttackDiscoveryVerdictAttachmentType } from '.';

const mockContext = {} as AttachmentFormatContext;

const validData = {
  summary_markdown: 'The attack correlated four alerts on one host.',
  verdict: 'true_positive',
};

const formatOf = (
  attachmentType: ReturnType<typeof createAttackDiscoveryVerdictAttachmentType>,
  data: unknown
) =>
  attachmentType.format(
    { data, id: 'analysis-verdict', type: ATTACK_DISCOVERY_VERDICT_ATTACHMENT_TYPE },
    mockContext
  ) as AgentFormattedAttachment;

describe('createAttackDiscoveryVerdictAttachmentType', () => {
  const attachmentType = createAttackDiscoveryVerdictAttachmentType();

  describe('id', () => {
    it('has the correct id', () => {
      expect(attachmentType.id).toBe(ATTACK_DISCOVERY_VERDICT_ATTACHMENT_TYPE);
    });
  });

  // The schema accepts 8k of summary plus 50k of rationale, which the 10k framework
  // default would silently truncate.
  describe('maxContentLength', () => {
    it('admits everything the schema accepts', () => {
      expect(attachmentType.maxContentLength).toBeGreaterThanOrEqual(58_000);
    });
  });

  describe('validate', () => {
    it.each(['false_positive', 'true_positive', 'inconclusive', 'failed'])(
      'accepts the %s verdict',
      (verdict) => {
        expect(attachmentType.validate({ ...validData, verdict })).toMatchObject({ valid: true });
      }
    );

    it('accepts an optional rationale_markdown', () => {
      expect(
        attachmentType.validate({ ...validData, rationale_markdown: 'Beaconing to a known C2.' })
      ).toMatchObject({ valid: true });
    });

    it('returns the parsed data when valid', () => {
      expect(attachmentType.validate(validData)).toEqual({ valid: true, data: validData });
    });

    // The whole point of the type: a verdict outside the enum is not a verdict.
    it('rejects a verdict outside the enum', () => {
      expect(attachmentType.validate({ ...validData, verdict: 'maybe' })).toMatchObject({
        valid: false,
      });
    });

    it('rejects a missing verdict', () => {
      expect(attachmentType.validate({ summary_markdown: 'No verdict here.' })).toMatchObject({
        valid: false,
      });
    });

    it('rejects a missing summary_markdown', () => {
      expect(attachmentType.validate({ verdict: 'inconclusive' })).toMatchObject({ valid: false });
    });

    // Bounded so one attachment cannot dominate the conversation's context.
    it('rejects a summary_markdown over 8000 characters', () => {
      expect(
        attachmentType.validate({ ...validData, summary_markdown: 'a'.repeat(8001) })
      ).toMatchObject({ valid: false });
    });

    it('rejects a rationale_markdown over 50000 characters', () => {
      expect(
        attachmentType.validate({ ...validData, rationale_markdown: 'a'.repeat(50_001) })
      ).toMatchObject({ valid: false });
    });

    it('rejects a plain text content payload, which is what this type replaced', () => {
      expect(
        attachmentType.validate({ content: '# Analysis verdict: true_positive' })
      ).toMatchObject({ valid: false });
    });

    it('returns invalid for null input', () => {
      expect(attachmentType.validate(null)).toMatchObject({ valid: false });
    });

    it('returns invalid for undefined input', () => {
      expect(attachmentType.validate(undefined)).toMatchObject({ valid: false });
    });
  });

  describe('format', () => {
    it('renders the verdict as the heading', () => {
      expect(formatOf(attachmentType, validData).getRepresentation?.()).toEqual({
        type: 'text',
        value: `# Analysis verdict: true_positive\n\n${validData.summary_markdown}`,
      });
    });

    it('renders a Rationale section when rationale_markdown is present', () => {
      const representation = formatOf(attachmentType, {
        ...validData,
        rationale_markdown: 'Beaconing to a known C2.',
      }).getRepresentation?.();

      expect(representation).toEqual({
        type: 'text',
        value: `# Analysis verdict: true_positive\n\n${validData.summary_markdown}\n\n## Rationale\nBeaconing to a known C2.`,
      });
    });

    it('omits the Rationale section when rationale_markdown is absent', () => {
      const representation = formatOf(attachmentType, validData).getRepresentation?.();

      expect((representation as { value: string }).value).not.toContain('## Rationale');
    });

    it('throws when the attachment data is invalid', () => {
      const formatted = formatOf(attachmentType, { verdict: 'maybe' });

      expect(() => formatted.getRepresentation?.()).toThrow();
    });
  });

  describe('getAgentDescription', () => {
    it('returns a non-empty description string', () => {
      expect((attachmentType.getAgentDescription?.() ?? '').length).toBeGreaterThan(0);
    });

    it.each(['false_positive', 'true_positive', 'inconclusive', 'failed'])(
      'names the %s verdict so the agent knows the vocabulary',
      (verdict) => {
        expect(attachmentType.getAgentDescription?.()).toContain(verdict);
      }
    );

    // The guide's bar: describe the user-visible outcome of rendering, not when or
    // why to use the content.
    it('describes what inline rendering looks like', () => {
      expect(attachmentType.getAgentDescription?.()).toContain(
        'Rendering this attachment inline displays'
      );
    });

    it.each(['Use it as', 'Treat it as', 'You have been provided'])(
      'does not tell the agent how to use the content ("%s")',
      (guidance) => {
        expect(attachmentType.getAgentDescription?.()).not.toContain(guidance);
      }
    );
  });
});
