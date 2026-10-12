/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { coreMock } from '@kbn/core/server/mocks';
import type { estypes } from '@elastic/elasticsearch';
import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { NewTermsRuleParams } from '../../../rule_schema';
import { NEW_TERMS_FIELD_CARDINALITY_EVENT } from '../../../../telemetry/event_based/events';

import { createNewTermsFieldCardinalityTracker } from './new_terms_field_cardinality_tracker';

/**
 * Builds composite-aggregation buckets shaped like the ones the recent-terms agg returns. Only `key`
 * matters to the tracker; `doc_count` is stamped to satisfy the ES bucket type.
 */
const buckets = (
  ...keys: estypes.AggregationsCompositeAggregateKey[]
): estypes.AggregationsCompositeBucket[] => keys.map((key) => ({ key, doc_count: 1 }));

const ruleParamsOf = (params: Partial<NewTermsRuleParams>): NewTermsRuleParams =>
  ({
    type: 'new_terms',
    immutable: false,
    newTermsFields: ['host.name'],
    ...params,
  }) as NewTermsRuleParams;

describe('createNewTermsFieldCardinalityTracker', () => {
  let mockAnalytics: jest.Mocked<AnalyticsServiceSetup>;
  let logger: Logger;

  beforeEach(() => {
    mockAnalytics = coreMock.createSetup().analytics;
    logger = { debug: jest.fn() } as unknown as Logger;
  });

  const createTracker = (params: Partial<NewTermsRuleParams> = {}, analytics = mockAnalytics) =>
    createNewTermsFieldCardinalityTracker({
      analytics,
      logger,
      ruleParams: ruleParamsOf(params),
    });

  it('reports the raw metrics for a single-field, fully scanned run', () => {
    const tracker = createTracker({ immutable: true, newTermsFields: ['host.name'] });

    // 'host-a' = 6, 'host-bb' = 7, 'host-cccc' = 9
    tracker.accumulate(
      buckets({ field_0: 'host-a' }, { field_0: 'host-bb' }, { field_0: 'host-cccc' })
    );
    tracker.markReachedEndOfStream();
    tracker.send();

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      NEW_TERMS_FIELD_CARDINALITY_EVENT.eventType,
      {
        isElasticRule: true,
        newTermsFieldsCount: 1,
        distinctFieldCombinations: 3,
        maxCombinationValueLength: 9,
        combinationValueLengthSum: 22,
        interruptedByMaxSignals: false,
      }
    );
  });

  it('sums the value lengths across every field in a multi-field combination', () => {
    const tracker = createTracker({ newTermsFields: ['host.name', 'source.ip'] });

    // 'host-a' = 6, '10.0.0.1' = 8
    tracker.accumulate(buckets({ field_0: 'host-a', field_1: '10.0.0.1' }));
    tracker.markReachedEndOfStream();
    tracker.send();

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      NEW_TERMS_FIELD_CARDINALITY_EVENT.eventType,
      expect.objectContaining({
        newTermsFieldsCount: 2,
        distinctFieldCombinations: 1,
        maxCombinationValueLength: 14,
        combinationValueLengthSum: 14,
      })
    );
  });

  it('accumulates across multiple pages', () => {
    const tracker = createTracker();

    tracker.accumulate(buckets({ field_0: 'aaa' }));
    tracker.accumulate(buckets({ field_0: 'bb' }, { field_0: 'ccccc' }));
    tracker.markReachedEndOfStream();
    tracker.send();

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      NEW_TERMS_FIELD_CARDINALITY_EVENT.eventType,
      expect.objectContaining({
        distinctFieldCombinations: 3,
        maxCombinationValueLength: 5,
        combinationValueLengthSum: 10,
      })
    );
  });

  it('handles numeric and nullish values without throwing', () => {
    const tracker = createTracker();

    // '42' = 2, null -> '' = 0
    tracker.accumulate(buckets({ field_0: 42 }, { field_0: null }));
    tracker.markReachedEndOfStream();
    tracker.send();

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      NEW_TERMS_FIELD_CARDINALITY_EVENT.eventType,
      expect.objectContaining({
        distinctFieldCombinations: 2,
        maxCombinationValueLength: 2,
        combinationValueLengthSum: 2,
      })
    );
  });

  it('marks interruptedByMaxSignals when the run did not reach the end of the stream', () => {
    const tracker = createTracker();

    tracker.accumulate(buckets({ field_0: 'host-a' }));
    // No markReachedEndOfStream(): the loop broke early after reaching maxSignals.
    tracker.send();

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      NEW_TERMS_FIELD_CARDINALITY_EVENT.eventType,
      expect.objectContaining({ interruptedByMaxSignals: true })
    );
  });

  it('does not report on an empty run (no recent terms)', () => {
    const tracker = createTracker();

    // Rule hit after_key == null on the first page: full scan of nothing.
    tracker.markReachedEndOfStream();
    tracker.send();

    expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
  });

  it('does not report during preview (no analytics)', () => {
    const tracker = createNewTermsFieldCardinalityTracker({
      analytics: undefined,
      logger,
      ruleParams: ruleParamsOf({}),
    });

    tracker.accumulate(buckets({ field_0: 'host-a' }));
    tracker.markReachedEndOfStream();

    expect(() => tracker.send()).not.toThrow();
  });

  it('does not throw if an error occurs. It instead skips the event, and logs at debug', () => {
    const tracker = createTracker();

    const hostileBuckets = [
      {
        get key() {
          throw new Error('boom');
        },
      },
    ] as unknown as estypes.AggregationsCompositeBucket[];

    tracker.accumulate(hostileBuckets);
    // A later well-formed page is ignored once the tracker has latched the error.
    tracker.accumulate(buckets({ field_0: 'host-a' }));
    tracker.markReachedEndOfStream();
    tracker.send();

    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Failed to accumulate New Terms field cardinality telemetry')
    );
    expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
  });
});
