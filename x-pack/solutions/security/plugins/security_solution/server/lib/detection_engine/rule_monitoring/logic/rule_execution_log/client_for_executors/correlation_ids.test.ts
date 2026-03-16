/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutionStatusEnum } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import type { RuleExecutionContext } from './client_interface';
import { getCorrelationIds } from './correlation_ids';

const createContext = (overrides?: Partial<RuleExecutionContext>): RuleExecutionContext => ({
  executionId: 'exec-123',
  ruleId: 'rule-id-1',
  ruleUuid: 'rule-uuid-1',
  ruleName: 'Test Rule',
  ruleRevision: 1,
  ruleType: 'siem.queryRule',
  spaceId: 'default',
  ...overrides,
});

describe('correlation_ids', () => {
  describe('getCorrelationIds', () => {
    it('returns a valid builder with all expected methods', () => {
      const builder = getCorrelationIds(createContext());

      expect(builder.withContext).toBeInstanceOf(Function);
      expect(builder.withStatus).toBeInstanceOf(Function);
      expect(builder.getLogSuffix).toBeInstanceOf(Function);
      expect(builder.getLogMeta).toBeInstanceOf(Function);
    });
  });

  describe('getLogSuffix', () => {
    it('formats all context fields into the expected bracket pattern', () => {
      const context = createContext();
      const builder = getCorrelationIds(context);

      expect(builder.getLogSuffix()).toBe(
        '[siem.queryRule][Test Rule][rule id rule-id-1][rule uuid rule-uuid-1][exec id exec-123][space default]'
      );
    });

    it('preserves special characters in context fields', () => {
      const context = createContext({
        ruleName: 'Rule with [brackets] & "quotes"',
        spaceId: 'space/with/slashes',
        ruleType: 'siem.eqlRule',
      });
      const builder = getCorrelationIds(context);

      expect(builder.getLogSuffix()).toBe(
        '[siem.eqlRule][Rule with [brackets] & "quotes"][rule id rule-id-1][rule uuid rule-uuid-1][exec id exec-123][space space/with/slashes]'
      );
    });
  });

  describe('getLogMeta', () => {
    it('returns correct structured metadata without status', () => {
      const context = createContext();
      const builder = getCorrelationIds(context);

      expect(builder.getLogMeta()).toEqual({
        rule: {
          id: 'rule-id-1',
          uuid: 'rule-uuid-1',
          name: 'Test Rule',
          type: 'siem.queryRule',
          execution: {
            uuid: 'exec-123',
          },
        },
        kibana: {
          spaceId: 'default',
        },
      });
    });

    it('does not include a status field when no status is set', () => {
      const builder = getCorrelationIds(createContext());
      const meta = builder.getLogMeta();

      expect(meta.rule?.execution).not.toHaveProperty('status');
    });
  });

  describe('withStatus', () => {
    it('adds status to the log meta', () => {
      const builder = getCorrelationIds(createContext()).withStatus(
        RuleExecutionStatusEnum.succeeded
      );
      const meta = builder.getLogMeta();

      expect(meta.rule?.execution?.status).toBe('succeeded');
    });

    it('allows overriding the status with a subsequent call', () => {
      const builder = getCorrelationIds(createContext())
        .withStatus(RuleExecutionStatusEnum.running)
        .withStatus(RuleExecutionStatusEnum.failed);

      expect(builder.getLogMeta().rule?.execution?.status).toBe('failed');
    });

    it('does not mutate the original builder', () => {
      const original = getCorrelationIds(createContext());
      const withStatus = original.withStatus(RuleExecutionStatusEnum.succeeded);

      expect(original.getLogMeta().rule?.execution).not.toHaveProperty('status');
      expect(withStatus.getLogMeta().rule?.execution?.status).toBe('succeeded');
    });
  });

  describe('withContext', () => {
    it('returns a new builder with overridden context', () => {
      const original = getCorrelationIds(createContext());
      const newContext = createContext({
        ruleId: 'new-rule-id',
        ruleName: 'New Rule',
        executionId: 'new-exec-id',
      });
      const updated = original.withContext(newContext);

      expect(updated.getLogSuffix()).toBe(
        '[siem.queryRule][New Rule][rule id new-rule-id][rule uuid rule-uuid-1][exec id new-exec-id][space default]'
      );
    });

    it('does not mutate the original builder', () => {
      const original = getCorrelationIds(createContext());
      const originalSuffix = original.getLogSuffix();

      original.withContext(
        createContext({
          ruleId: 'different-id',
          ruleName: 'Different Rule',
        })
      );

      expect(original.getLogSuffix()).toBe(originalSuffix);
    });

    it('preserves status when context is overridden', () => {
      const builder = getCorrelationIds(createContext()).withStatus(
        RuleExecutionStatusEnum['partial failure']
      );
      const updated = builder.withContext(createContext({ ruleId: 'new-rule-id' }));

      expect(updated.getLogMeta().rule?.execution?.status).toBe('partial failure');
      expect(updated.getLogMeta().rule?.id).toBe('new-rule-id');
    });
  });
});
