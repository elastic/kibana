/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  detectionRulesCreatedTriggerDef,
  MAX_RULES_PER_TRIGGER,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_RULES_EVENT,
} from '../../../common/workflows/triggers';
import { SecuritySolutionEventBus } from '../../events/event_bus';
import type { DetectionRulesCreatedPayload } from '../../events/types';
import { emitDetectionRulesCreatedInChunks, type CreatedRuleSummary } from './emit_rules_created';

const makeRules = (count: number): CreatedRuleSummary[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `so-${i}`,
    type: 'query',
    tags: [],
  }));

describe('emitDetectionRulesCreatedInChunks', () => {
  const request = httpServerMock.createKibanaRequest();
  let eventBus: SecuritySolutionEventBus;
  let payloads: DetectionRulesCreatedPayload[];

  beforeEach(() => {
    eventBus = new SecuritySolutionEventBus();
    payloads = [];
    eventBus.onDetectionRulesCreated((event) => {
      payloads.push(event.payload);
    });
  });

  const emit = (rules: CreatedRuleSummary[]) =>
    emitDetectionRulesCreatedInChunks({ eventBus, request, rules, source: 'api' });

  it('emits nothing when no rules were created', () => {
    emit([]);
    expect(payloads).toHaveLength(0);
  });

  it('emits one event with the ids and the distinct types and tags', () => {
    emit([
      { id: 'so-1', type: 'query', tags: ['a', 'b'] },
      { id: 'so-2', type: 'query', tags: ['b'] },
      { id: 'so-3', type: 'eql' },
    ]);

    expect(payloads).toEqual([
      {
        ids: ['so-1', 'so-2', 'so-3'],
        types: ['query', 'eql'],
        tags: ['a', 'b'],
        totalCount: 3,
        source: 'api',
      },
    ]);
  });

  // Consumers need every id, so exceeding the cap must split the event, not truncate it.
  it.each([
    { total: MAX_RULES_PER_TRIGGER, expectedChunks: 1 },
    { total: MAX_RULES_PER_TRIGGER + 1, expectedChunks: 2 },
    { total: 2 * MAX_RULES_PER_TRIGGER + 1, expectedChunks: 3 },
  ])(
    'splits $total rules into $expectedChunks events without losing any id',
    ({ total, expectedChunks }) => {
      emit(makeRules(total));

      expect(payloads).toHaveLength(expectedChunks);
      payloads.forEach((payload) => {
        expect(payload.ids.length).toBeLessThanOrEqual(MAX_RULES_PER_TRIGGER);
        expect(payload.totalCount).toBe(total);
      });
      expect(payloads.flatMap(({ ids }) => ids)).toEqual(makeRules(total).map(({ id }) => id));
    }
  );

  it('produces payloads the trigger schema accepts even for oversized tag input', () => {
    const manyTags = Array.from({ length: MAX_TAGS_PER_RULES_EVENT + 50 }, (_, i) => `tag-${i}`);
    emit([
      { id: 'so-1', type: 'query', tags: manyTags },
      {
        id: 'so-2',
        type: 'a_future_type',
        tags: ['x'.repeat(MAX_TAG_LENGTH + 40)],
      },
    ]);

    expect(payloads).toHaveLength(1);
    expect(payloads[0].tags).toHaveLength(MAX_TAGS_PER_RULES_EVENT);
    expect(payloads[0].ids).toEqual(['so-1', 'so-2']);
    expect(() => detectionRulesCreatedTriggerDef.eventSchema.parse(payloads[0])).not.toThrow();
  });

  it('never throws when the event bus fails and logs a warning', () => {
    const logger = loggingSystemMock.createLogger();
    jest.spyOn(eventBus, 'emitDetectionRulesCreated').mockImplementation(() => {
      throw new Error('bus down');
    });

    expect(() =>
      emitDetectionRulesCreatedInChunks({
        eventBus,
        request,
        rules: makeRules(MAX_RULES_PER_TRIGGER + 1),
        source: 'api',
        logger,
      })
    ).not.toThrow();
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});
