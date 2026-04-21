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
      expect(description).toContain('attachment_id');
    });

    it('does not leak the removed {riskEntityData} placeholder', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).not.toContain('{riskEntityData}');
    });
  });
});
