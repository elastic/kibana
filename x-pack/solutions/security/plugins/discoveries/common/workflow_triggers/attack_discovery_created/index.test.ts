/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AttackDiscoveryCreatedTriggerId,
  attackDiscoveryCreatedEventSchema,
  attackDiscoveryCreatedTriggerCommonDefinition,
} from '.';

/**
 * A minimal valid emitter payload (the fields the `discoveries` plugin provides
 * when it emits the event — id and non-sensitive metadata only).
 */
const validPayload = {
  alertIds: ['alert-1', 'alert-2'],
  attackDiscoveryAlertId: 'ad-alert-123',
  generationUuid: '11111111-1111-1111-1111-111111111111',
  riskScore: 73,
  spaceId: 'default',
};

/**
 * The same payload after the workflow execution engine enriches it with the
 * `timestamp`, `spaceId` and `eventChainDepth` it adds before validating.
 * See `workflows_execution_engine/server/trigger_events/trigger_event_handler.ts`.
 */
const enrichedEvent = {
  ...validPayload,
  eventChainDepth: 0,
  timestamp: '2026-08-02T00:00:00.000Z',
};

describe('attackDiscoveryCreated trigger', () => {
  describe('AttackDiscoveryCreatedTriggerId', () => {
    it('is exactly security.attackDiscoveryCreated', () => {
      expect(AttackDiscoveryCreatedTriggerId).toBe('security.attackDiscoveryCreated');
    });
  });

  describe('attackDiscoveryCreatedTriggerCommonDefinition', () => {
    it('uses the exported trigger id', () => {
      expect(attackDiscoveryCreatedTriggerCommonDefinition.id).toBe(
        AttackDiscoveryCreatedTriggerId
      );
    });

    it('is registered as tech_preview stability', () => {
      expect(attackDiscoveryCreatedTriggerCommonDefinition.stability).toBe('tech_preview');
    });

    it('has a non-empty title and description', () => {
      expect(attackDiscoveryCreatedTriggerCommonDefinition.title.length).toBeGreaterThan(0);
      expect(attackDiscoveryCreatedTriggerCommonDefinition.description.length).toBeGreaterThan(0);
    });

    it('documents a real YAML example referencing the trigger id', () => {
      const examples = attackDiscoveryCreatedTriggerCommonDefinition.documentation?.examples ?? [];
      expect(examples.length).toBeGreaterThan(0);
      expect(examples.some((example) => example.includes(AttackDiscoveryCreatedTriggerId))).toBe(
        true
      );
      expect(examples.some((example) => example.includes('```yaml'))).toBe(true);
    });

    it('shares the exported event schema', () => {
      expect(attackDiscoveryCreatedTriggerCommonDefinition.eventSchema).toBe(
        attackDiscoveryCreatedEventSchema
      );
    });
  });

  describe('attackDiscoveryCreatedEventSchema', () => {
    it('accepts the emitter payload (id and non-sensitive metadata only)', () => {
      const result = attackDiscoveryCreatedEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('accepts the enriched event (engine adds timestamp, spaceId and eventChainDepth)', () => {
      const result = attackDiscoveryCreatedEventSchema.safeParse(enrichedEvent);
      expect(result.success).toBe(true);
    });

    it('treats riskScore as optional', () => {
      const { riskScore, ...withoutRiskScore } = validPayload;
      const result = attackDiscoveryCreatedEventSchema.safeParse(withoutRiskScore);
      expect(result.success).toBe(true);
    });

    it('rejects unknown fields', () => {
      const result = attackDiscoveryCreatedEventSchema.safeParse({
        ...validPayload,
        unexpected: 'nope',
      });
      expect(result.success).toBe(false);
    });

    it('rejects AD narrative content (summaryMarkdown) as an information-disclosure guard', () => {
      const result = attackDiscoveryCreatedEventSchema.safeParse({
        ...validPayload,
        summaryMarkdown: 'sensitive attack discovery summary',
      });
      expect(result.success).toBe(false);
    });

    it('rejects a payload missing the attack discovery alert id', () => {
      const { attackDiscoveryAlertId, ...withoutId } = validPayload;
      const result = attackDiscoveryCreatedEventSchema.safeParse(withoutId);
      expect(result.success).toBe(false);
    });

    it('rejects alertIds that are not an array of strings', () => {
      const result = attackDiscoveryCreatedEventSchema.safeParse({
        ...validPayload,
        alertIds: 'alert-1',
      });
      expect(result.success).toBe(false);
    });
  });
});
