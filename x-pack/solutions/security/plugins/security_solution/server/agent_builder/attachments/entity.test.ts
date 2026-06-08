/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SECURITY_ENTITY_RISK_SCORE_TOOL_ID } from '../tools';
import { createEntityAttachmentType, MAX_ENTITIES_PER_ATTACHMENT } from './entity';

describe('createEntityAttachmentType', () => {
  const attachmentType = createEntityAttachmentType();

  describe('validate', () => {
    it('returns valid when entity data is valid with host identifierType', async () => {
      const input = {
        identifierType: 'host',
        identifier: 'hostname-1',
        attachmentLabel: 'Risk Entity',
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns valid when entity data is valid with user identifierType', async () => {
      const input = {
        identifierType: 'user',
        identifier: 'username-1',
        attachmentLabel: 'Risk Entity',
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns valid when entity data is valid with service identifierType', async () => {
      const input = {
        identifierType: 'service',
        identifier: 'service-1',
        attachmentLabel: 'Risk Entity',
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns valid when entity data is valid with generic identifierType', async () => {
      const input = {
        identifierType: 'generic',
        identifier: 'generic-1',
        attachmentLabel: 'Risk Entity',
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns invalid when identifierType is missing', async () => {
      const input = { identifier: 'test-identifier' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });

    it('returns invalid when identifier is missing', async () => {
      const input = { identifierType: 'host' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });

    it('returns invalid when identifier is empty string', async () => {
      const input = { identifierType: 'host', identifier: '' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });

    it('returns invalid when identifierType is not in enum', async () => {
      const input = { identifierType: 'invalid', identifier: 'test' };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBeDefined();
      }
    });

    describe('single-entity risk stats (riskStats / resolutionRiskStats)', () => {
      // Mirrors the stripped shape produced by
      // `stripRiskRecordForAttachment` in the server-side tool.
      const buildRiskStats = (overrides: Record<string, unknown> = {}) => ({
        '@timestamp': '2024-05-01T00:00:00Z',
        id_field: 'user.name',
        id_value: 'user:982675@github',
        calculated_level: 'Low',
        calculated_score: 89.617,
        calculated_score_norm: 34.57,
        category_1_score: 25,
        category_1_count: 2,
        category_2_score: 5,
        category_2_count: 1,
        notes: [],
        modifiers: [],
        score_type: 'base',
        ...overrides,
      });

      it('preserves riskStats on the validated payload (regression: must not be stripped)', async () => {
        const riskStats = buildRiskStats();
        const input = {
          identifierType: 'user',
          identifier: 'haylee-anderson',
          attachmentLabel: 'Risk Entity',
          riskStats,
        };

        const result = await attachmentType.validate(input);

        expect(result.valid).toBe(true);
        if (result.valid) {
          // The validator MUST echo the risk stats back — this is what
          // reaches `AttachmentStateManager.add` and, eventually, the
          // client-side `RiskSummaryMini`. If this ever regresses the
          // chat card silently falls back to the entity-store-derived
          // zero-category shape.
          expect(result.data).toEqual(
            expect.objectContaining({ riskStats: expect.objectContaining(riskStats) })
          );
        }
      });

      it('preserves both riskStats and resolutionRiskStats on the validated payload', async () => {
        const riskStats = buildRiskStats();
        const resolutionRiskStats = buildRiskStats({
          calculated_level: 'Critical',
          calculated_score_norm: 95,
          category_1_score: 80,
          category_1_count: 12,
          score_type: 'resolution',
        });

        const result = await attachmentType.validate({
          identifierType: 'host',
          identifier: 'server1',
          riskStats,
          resolutionRiskStats,
        });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data).toEqual(
            expect.objectContaining({
              riskStats: expect.objectContaining(riskStats),
              resolutionRiskStats: expect.objectContaining(resolutionRiskStats),
            })
          );
        }
      });

      it('preserves forward-compatible risk-stats fields via passthrough', async () => {
        // `stripRiskRecordForAttachment` may surface new optional fields
        // in the future; passthrough ensures we do not have to change the
        // schema for each additive field before the client can consume it.
        const riskStats = buildRiskStats({ future_field: 'future-value' });

        const result = await attachmentType.validate({
          identifierType: 'host',
          identifier: 'server1',
          riskStats,
        });

        expect(result.valid).toBe(true);
        if (result.valid) {
          const data = result.data as { riskStats: Record<string, unknown> };
          expect(data.riskStats.future_field).toBe('future-value');
        }
      });

      it('still validates when riskStats is omitted (backward compatibility)', async () => {
        const input = {
          identifierType: 'user',
          identifier: 'haylee-anderson',
          attachmentLabel: 'Risk Entity',
        };

        const result = await attachmentType.validate(input);

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data).toEqual(input);
          expect(result.data).not.toHaveProperty('riskStats');
          expect(result.data).not.toHaveProperty('resolutionRiskStats');
        }
      });

      it('returns invalid when riskStats is missing required fields', async () => {
        const result = await attachmentType.validate({
          identifierType: 'user',
          identifier: 'haylee-anderson',
          // Missing calculated_level / calculated_score / etc. — must be
          // rejected so the client never sees a partially-shaped payload
          // that would trip `isValidRiskStats` only at render time.
          riskStats: { category_1_score: 10 },
        });

        expect(result.valid).toBe(false);
      });

      it('returns invalid when riskStats uses a wrong type for a required field', async () => {
        const result = await attachmentType.validate({
          identifierType: 'user',
          identifier: 'haylee-anderson',
          riskStats: buildRiskStats({ calculated_score_norm: 'not-a-number' }),
        });

        expect(result.valid).toBe(false);
      });

      it('does not accept riskStats on the multi-entity payload shape', async () => {
        // The multi-entity branch intentionally does not carry risk stats
        // (the aggregate renderer fetches its own per-row summary). If
        // a caller tries to embed them here, Zod strips the field to
        // match the declared shape — documenting the split so reviewers
        // understand why multi-entity payloads omit the breakdown.
        const result = await attachmentType.validate({
          entities: [{ identifierType: 'host', identifier: 'hostname-1' }],
          riskStats: {
            calculated_level: 'Low',
            calculated_score: 0,
            calculated_score_norm: 0,
            category_1_score: 0,
            category_1_count: 0,
          },
        });

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data).not.toHaveProperty('riskStats');
        }
      });
    });

    describe('multi-entity (entities list)', () => {
      it('returns valid when entities array contains a single item', async () => {
        const input = {
          entities: [{ identifierType: 'host', identifier: 'hostname-1' }],
          attachmentLabel: '1 risk entity',
        };

        const result = await attachmentType.validate(input);

        expect(result.valid).toBe(true);
        if (result.valid) {
          expect(result.data).toEqual(input);
        }
      });

      it('returns valid when entities array contains mixed types', async () => {
        const input = {
          entities: [
            { identifierType: 'host', identifier: 'hostname-1' },
            { identifierType: 'user', identifier: 'username-1' },
            { identifierType: 'service', identifier: 'service-1' },
            { identifierType: 'generic', identifier: 'generic-1' },
          ],
        };

        const result = await attachmentType.validate(input);

        expect(result.valid).toBe(true);
      });

      it('returns invalid when entities array is empty', async () => {
        const input = { entities: [] };

        const result = await attachmentType.validate(input);

        expect(result.valid).toBe(false);
      });

      it(`returns invalid when entities array exceeds MAX_ENTITIES_PER_ATTACHMENT (${MAX_ENTITIES_PER_ATTACHMENT})`, async () => {
        const input = {
          entities: Array.from({ length: MAX_ENTITIES_PER_ATTACHMENT + 1 }, (_, i) => ({
            identifierType: 'host' as const,
            identifier: `host-${i}`,
          })),
        };

        const result = await attachmentType.validate(input);

        expect(result.valid).toBe(false);
      });

      it('returns invalid when an entity in the list is malformed', async () => {
        const input = {
          entities: [
            { identifierType: 'host', identifier: 'hostname-1' },
            { identifierType: 'invalid', identifier: 'oops' },
          ],
        };

        const result = await attachmentType.validate(input);

        expect(result.valid).toBe(false);
      });
    });
  });

  describe('getTools', () => {
    it('returns entity risk score tool', () => {
      const tools = attachmentType.getTools?.();

      expect(tools).toBeDefined();
      if (tools) {
        expect(tools).toEqual([SECURITY_ENTITY_RISK_SCORE_TOOL_ID]);
      }
    });
  });

  describe('getAgentDescription', () => {
    it('returns expected description', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('risk entit');
      expect(description).toContain('identifierType');
      expect(description).toContain('identifier');
    });

    it('mentions both single and list payload shapes', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('entities');
    });

    it('instructs the agent to emit <render_attachment> so the inline renderer fires', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('<render_attachment');
    });

    it('uses the platform attribute names `id` and `version`, not the legacy `attachment_id` attribute', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('id="ATTACHMENT_ID"');
      expect(description).toContain('version="VERSION"');
      expect(description).not.toMatch(/<render_attachment[^>]*\battachment_id=/);
    });

    it('points the agent at the manifest `attachment_id` and `current_version` fields (not synthesis)', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('attachment_id');
      expect(description).toContain('current_version');
      expect(description?.toLowerCase()).toContain('verbatim');
    });

    it('does not leak the removed {riskEntityData} placeholder', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).not.toContain('{riskEntityData}');
    });
  });
});
