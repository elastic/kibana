/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../../common';
import {
  SECURITY_ENTITY_RISK_SCORE_TOOL_ID,
  SECURITY_GET_ENTITY_TOOL_ID,
  SECURITY_SEARCH_ENTITIES_TOOL_ID,
} from '../tools';

import { createEntityAttachmentType } from './entity';

describe('createEntityAttachmentType', () => {
  const experimentalFeatures = { entityAnalyticsEntityStoreV2: true } as ExperimentalFeatures;
  const attachmentType = createEntityAttachmentType(experimentalFeatures);

  describe('validate', () => {
    it('returns valid when entity data is valid with host identifierType', async () => {
      const input = {
        attachmentLabel: 'Risk Entity',
        entities: [
          {
            entityType: 'host',
            entityId: 'hostname-1',
            riskScore: 85.0,
          },
        ],
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns valid when entity data is valid with user identifierType', async () => {
      const input = {
        attachmentLabel: 'Risk Entity',
        entities: [
          {
            entityType: 'user',
            entityId: 'username-1',
            riskScore: 39.0,
          },
        ],
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns valid when entity data is valid with service identifierType', async () => {
      const input = {
        attachmentLabel: 'Risk Entity',
        entities: [
          {
            entityType: 'service',
            entityId: 'service-1',
          },
        ],
      };

      const result = await attachmentType.validate(input);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data).toEqual(input);
      }
    });

    it('returns valid when entity data is valid with generic identifierType', async () => {
      const input = {
        attachmentLabel: 'Risk Entity',
        entities: [
          {
            entityType: 'generic',
            entityId: 'generic-1',
          },
        ],
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
  });

  describe('getTools', () => {
    it('returns entity risk score tool if entityAnalyticsEntityStoreV2 flag is false', () => {
      const attachmentType_ = createEntityAttachmentType({
        entityAnalyticsEntityStoreV2: false,
      } as ExperimentalFeatures);
      const tools = attachmentType_.getTools?.();

      expect(tools).toBeDefined();
      if (tools) {
        expect(tools).toEqual([SECURITY_ENTITY_RISK_SCORE_TOOL_ID]);
      }
    });

    it('returns entity store get tool if entityAnalyticsEntityStoreV2 flag is true', () => {
      const tools = attachmentType.getTools?.();

      expect(tools).toBeDefined();
      if (tools) {
        expect(tools).toEqual([SECURITY_GET_ENTITY_TOOL_ID, SECURITY_SEARCH_ENTITIES_TOOL_ID]);
      }
    });
  });

  describe('getAgentDescription', () => {
    it('returns expected description', () => {
      const description = attachmentType.getAgentDescription?.();

      expect(description).toContain('risk entity');
      expect(description).toContain('RISK ENTITY DATA');
      expect(description).toContain('identifierType');
      expect(description).toContain('identifier');
    });
  });
});
