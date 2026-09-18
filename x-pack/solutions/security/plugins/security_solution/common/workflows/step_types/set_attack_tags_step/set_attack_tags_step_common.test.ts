/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  setAttackTagsInputSchema,
  setAttackTagsOutputSchema,
  setAttackTagsStepCommonDefinition,
} from './set_attack_tags_step_common';

describe('setAttackTagsStepCommonDefinition', () => {
  it('has the correct id', () => {
    expect(setAttackTagsStepCommonDefinition.id).toBe('security.setAttackTags');
  });

  describe('inputSchema', () => {
    it('validates a single attack ID with tags_to_add', () => {
      const input = {
        ids: 'attack-1',
        tags_to_add: ['tag1'],
      };
      expect(setAttackTagsInputSchema.parse(input)).toEqual({
        ids: 'attack-1',
        tags_to_add: ['tag1'],
        tags_to_remove: [],
        update_related_alerts: false,
      });
    });

    it('validates an array of attack IDs with tags_to_add and tags_to_remove', () => {
      const input = {
        ids: ['attack-1', 'attack-2'],
        tags_to_add: ['tag1'],
        tags_to_remove: ['tag2'],
        update_related_alerts: true,
      };
      expect(setAttackTagsInputSchema.parse(input)).toEqual({
        ids: ['attack-1', 'attack-2'],
        tags_to_add: ['tag1'],
        tags_to_remove: ['tag2'],
        update_related_alerts: true,
      });
    });

    it('validates a single attack ID with tags_to_remove', () => {
      const input = {
        ids: 'attack-1',
        tags_to_remove: ['tag1'],
      };
      expect(setAttackTagsInputSchema.parse(input)).toEqual({
        ids: 'attack-1',
        tags_to_add: [],
        tags_to_remove: ['tag1'],
        update_related_alerts: false,
      });
    });

    it('rejects if neither tags_to_add nor tags_to_remove is provided', () => {
      const input = {
        ids: 'attack-1',
      };
      expect(() => setAttackTagsInputSchema.parse(input)).toThrow();
    });

    it('rejects if both tags_to_add and tags_to_remove are empty arrays', () => {
      const input = {
        ids: 'attack-1',
        tags_to_add: [],
        tags_to_remove: [],
      };
      expect(() => setAttackTagsInputSchema.parse(input)).toThrow();
    });

    it('rejects empty ids array', () => {
      const input = {
        ids: [],
        tags_to_add: ['tag1'],
      };
      expect(() => setAttackTagsInputSchema.parse(input)).toThrow();
    });

    it('rejects excessively long attack IDs', () => {
      const input = {
        ids: 'a'.repeat(257),
        tags_to_add: ['tag1'],
      };
      expect(() => setAttackTagsInputSchema.parse(input)).toThrow();
    });
  });

  describe('outputSchema', () => {
    it('validates success true', () => {
      expect(setAttackTagsOutputSchema.parse({ success: true })).toEqual({ success: true });
    });

    it('validates success with message', () => {
      expect(setAttackTagsOutputSchema.parse({ success: true, message: 'Tags updated' })).toEqual({
        success: true,
        message: 'Tags updated',
      });
    });

    it('rejects missing success', () => {
      expect(() => setAttackTagsOutputSchema.parse({})).toThrow();
    });
  });
});
