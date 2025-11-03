/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessEvent } from '../types/v1';
import { normalizeEventProcessArgs } from './process_args_normalizer';

describe('normalizeEventArgs', () => {
  describe('basic functionality', () => {
    it('should normalize undefined args to empty array', () => {
      const event: ProcessEvent = {
        process: {
          entity_id: 'test-id',
        },
      };

      const result = normalizeEventProcessArgs(event);
      expect(result).toStrictEqual({
        process: {
          args: [],
          entity_id: 'test-id',
        },
      });
    });

    it('should normalize null args to empty array', () => {
      const event: ProcessEvent = {
        process: {
          args: null as unknown as string[],
        },
      };

      const result = normalizeEventProcessArgs(event);
      expect(result).toStrictEqual({
        process: {
          args: [],
        },
      });
    });

    it('should normalize string args to array', () => {
      const event: ProcessEvent = {
        process: {
          args: 'single-command' as any, // Simulate incoming string data
          entity_id: 'test-id',
        },
      };

      const result = normalizeEventProcessArgs(event);
      expect(result).toStrictEqual({
        process: {
          args: ['single-command'],
          entity_id: 'test-id',
        },
      });
    });

    it('should leave array args unchanged', () => {
      const event: ProcessEvent = {
        process: {
          args: ['ls', '-la'],
          entity_id: 'test-id',
        },
      };

      const result = normalizeEventProcessArgs(event);
      expect(result).toStrictEqual({
        process: {
          args: ['ls', '-la'],
          entity_id: 'test-id',
        },
      });
    });
  });

  describe('nested process objects', () => {
    it('should normalize args in parent process', () => {
      const event: ProcessEvent = {
        process: {
          entity_id: 'test-id',
          args: ['ls', '-la'],
          parent: {
            args: 'parent-command' as any, // Simulate incoming string data
            entity_id: 'parent-id',
          },
        },
      };

      const result = normalizeEventProcessArgs(event);
      expect(result.process?.parent?.args).toEqual(['parent-command']);
      expect(result.process?.args).toEqual(['ls', '-la']);
      expect(result).toStrictEqual({
        process: {
          entity_id: 'test-id',
          args: ['ls', '-la'],
          parent: {
            args: ['parent-command'],
            entity_id: 'parent-id',
          },
        },
      });
    });

    it('should normalize args in session_leader process', () => {
      const event: ProcessEvent = {
        process: {
          args: [],
          entity_id: 'test-id',
          session_leader: {
            args: 'session-leader-command' as any,
            entity_id: 'session-leader-id',
          },
        },
      };

      const result = normalizeEventProcessArgs(event);
      expect(result).toStrictEqual({
        process: {
          args: [],
          entity_id: 'test-id',
          session_leader: {
            args: ['session-leader-command'],
            entity_id: 'session-leader-id',
          },
        },
      });
    });

    it('should normalize args in multiple nested processes', () => {
      const event: ProcessEvent = {
        process: {
          entity_id: 'test-id',
          args: 'main-command' as any,
          parent: {
            args: 'parent-command' as any,
            entity_id: 'parent-id',
          },
          session_leader: {
            args: ['already', 'normalized'],
            entity_id: 'session-leader-id',
          },
          entry_leader: {
            args: 'entry-command' as any,
            entity_id: 'entry-leader-id',
          },
        },
      };

      const result = normalizeEventProcessArgs(event);
      expect(result).toStrictEqual({
        process: {
          entity_id: 'test-id',
          args: ['main-command'],
          parent: {
            args: ['parent-command'],
            entity_id: 'parent-id',
          },
          session_leader: {
            args: ['already', 'normalized'],
            entity_id: 'session-leader-id',
          },
          entry_leader: {
            args: ['entry-command'],
            entity_id: 'entry-leader-id',
          },
        },
      });
    });
  });

  describe('immutability', () => {
    it('should not mutate the original event object', () => {
      const originalEvent: ProcessEvent = {
        process: {
          args: 'original-command' as any,
          entity_id: 'test-id',
          parent: {
            args: 'parent-command' as any,
            entity_id: 'parent-id',
          },
        },
      };

      const result = normalizeEventProcessArgs(originalEvent);

      // Original should remain unchanged
      expect(originalEvent.process?.args as any).toBe('original-command');
      expect(originalEvent.process?.parent?.args as any).toBe('parent-command');

      // Result should have normalized args
      expect(result.process?.args).toEqual(['original-command']);
      expect(result.process?.parent?.args).toEqual(['parent-command']);

      // Should be different objects
      expect(result).not.toBe(originalEvent);
      expect(result.process).not.toBe(originalEvent.process);
      expect(result.process?.parent).not.toBe(originalEvent.process?.parent);
    });

    it('should return original object when event is undefined', () => {
      const result = normalizeEventProcessArgs(undefined as any);
      expect(result).toBeUndefined();
    });

    it('should return original object when process is undefined', () => {
      const event: ProcessEvent = { '@timestamp': '2023-01-01T00:00:00Z' };
      const result = normalizeEventProcessArgs(event);
      expect(result).toBe(event);
    });
  });
});
