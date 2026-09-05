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

import {
  accumulateNewTermsFieldCardinality,
  createNewTermsFieldCardinalityAccumulator,
  sendNewTermsFieldCardinalityTelemetryEvent,
} from './send_new_terms_field_cardinality_telemetry_event';

/**
 * Builds composite-aggregation buckets shaped like the ones the recent-terms agg returns. Only `key`
 * matters to the accumulator; `doc_count` is stamped to satisfy the ES bucket type.
 */
const buckets = (
  ...keys: Array<estypes.AggregationsCompositeAggregateKey>
): estypes.AggregationsCompositeBucket[] => keys.map((key) => ({ key, doc_count: 1 }));

describe('createNewTermsFieldCardinalityAccumulator', () => {
  it('should start with zeroed metrics and no error', () => {
    expect(createNewTermsFieldCardinalityAccumulator()).toEqual({
      distinctFieldCombinations: 0,
      maxCombinationValueLength: 0,
      combinationValueLengthSum: 0,
      completedFullScan: false,
      hasError: false,
    });
  });
});

describe('accumulateNewTermsFieldCardinality', () => {
  it('should count single-field composite buckets and measure their value lengths', () => {
    const accumulator = createNewTermsFieldCardinalityAccumulator();

    // Single-field composite buckets: key is an object keyed by the field alias.
    accumulateNewTermsFieldCardinality(
      accumulator,
      buckets({ field_0: 'host-a' }, { field_0: 'host-bbbb' })
    );

    expect(accumulator.distinctFieldCombinations).toBe(2);
    // 'host-a' = 6, 'host-bbbb' = 9
    expect(accumulator.maxCombinationValueLength).toBe(9);
    expect(accumulator.combinationValueLengthSum).toBe(15);
    expect(accumulator.hasError).toBe(false);
  });

  it('should sum the value lengths across every field in a multi-field combination', () => {
    const accumulator = createNewTermsFieldCardinalityAccumulator();

    accumulateNewTermsFieldCardinality(
      accumulator,
      buckets({ field_0: 'host-a', field_1: '10.0.0.1' })
    );

    // 'host-a' = 6, '10.0.0.1' = 8
    expect(accumulator.distinctFieldCombinations).toBe(1);
    expect(accumulator.maxCombinationValueLength).toBe(14);
    expect(accumulator.combinationValueLengthSum).toBe(14);
  });

  it('should accumulate across multiple pages', () => {
    const accumulator = createNewTermsFieldCardinalityAccumulator();

    accumulateNewTermsFieldCardinality(accumulator, buckets({ field_0: 'aaa' }));
    accumulateNewTermsFieldCardinality(
      accumulator,
      buckets({ field_0: 'bb' }, { field_0: 'ccccc' })
    );

    expect(accumulator.distinctFieldCombinations).toBe(3);
    expect(accumulator.maxCombinationValueLength).toBe(5);
    expect(accumulator.combinationValueLengthSum).toBe(10);
  });

  it('should treat numeric and nullish values without throwing', () => {
    const accumulator = createNewTermsFieldCardinalityAccumulator();

    accumulateNewTermsFieldCardinality(accumulator, buckets({ field_0: 42 }, { field_0: null }));

    expect(accumulator.distinctFieldCombinations).toBe(2);
    // '42' = 2, null -> '' = 0
    expect(accumulator.maxCombinationValueLength).toBe(2);
    expect(accumulator.combinationValueLengthSum).toBe(2);
    expect(accumulator.hasError).toBe(false);
  });

  it('should defensively handle a non-object scalar key', () => {
    const accumulator = createNewTermsFieldCardinalityAccumulator();

    // Composite bucket keys are always objects, so this shape is not reachable through the type. The
    // cast exercises the defensive branch that guards against a malformed key at runtime.
    accumulateNewTermsFieldCardinality(accumulator, [
      { key: 'scalar', doc_count: 1 },
    ] as unknown as estypes.AggregationsCompositeBucket[]);

    expect(accumulator.distinctFieldCombinations).toBe(1);
    expect(accumulator.maxCombinationValueLength).toBe(6);
    expect(accumulator.combinationValueLengthSum).toBe(6);
  });

  it('should flag hasError, log, and stop accumulating when a page throws', () => {
    const accumulator = createNewTermsFieldCardinalityAccumulator();
    const logger = { debug: jest.fn() } as unknown as Logger;

    // A getter that throws forces the guarded try/catch to trip.
    const hostileBuckets = [
      {
        get key() {
          throw new Error('boom');
        },
      },
    ] as unknown as estypes.AggregationsCompositeBucket[];

    accumulateNewTermsFieldCardinality(accumulator, hostileBuckets, logger);

    expect(accumulator.hasError).toBe(true);
    expect(logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Failed to accumulate New Terms field cardinality telemetry')
    );
    const combinationsAfterError = accumulator.distinctFieldCombinations;

    // Subsequent well-formed pages are ignored once the accumulator is in an error state, so no
    // further counting happens. Any partial value left behind is never emitted because the reporter
    // skips on hasError.
    accumulateNewTermsFieldCardinality(accumulator, buckets({ field_0: 'host-a' }));
    expect(accumulator.distinctFieldCombinations).toBe(combinationsAfterError);
  });
});

describe('sendNewTermsFieldCardinalityTelemetryEvent', () => {
  let mockAnalytics: jest.Mocked<AnalyticsServiceSetup>;
  let mockCore: ReturnType<typeof coreMock.createSetup>;

  beforeEach(() => {
    mockCore = coreMock.createSetup();
    mockAnalytics = mockCore.analytics;
  });

  it('should report aggregate metrics with the average rounded', () => {
    const accumulator = createNewTermsFieldCardinalityAccumulator();
    accumulateNewTermsFieldCardinality(
      accumulator,
      buckets(
        { field_0: 'host-a' }, // 6
        { field_0: 'host-bb' }, // 7
        { field_0: 'host-cccc' } // 9
      )
    );
    accumulator.completedFullScan = true;

    const ruleParams = {
      type: 'new_terms',
      immutable: true,
      newTermsFields: ['host.name'],
    } as NewTermsRuleParams;

    sendNewTermsFieldCardinalityTelemetryEvent({
      analytics: mockAnalytics,
      ruleParams,
      accumulator,
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      NEW_TERMS_FIELD_CARDINALITY_EVENT.eventType,
      {
        isElasticRule: true,
        newTermsFieldsCount: 1,
        distinctFieldCombinations: 3,
        maxCombinationValueLength: 9,
        // (6 + 7 + 9) / 3 = 7.33 -> 7
        avgCombinationValueLength: 7,
        completedFullScan: true,
      }
    );
  });

  it('should report a zero average when nothing was counted', () => {
    const accumulator = createNewTermsFieldCardinalityAccumulator();
    const ruleParams = {
      type: 'new_terms',
      immutable: false,
      newTermsFields: ['host.name', 'user.name'],
    } as NewTermsRuleParams;

    sendNewTermsFieldCardinalityTelemetryEvent({
      analytics: mockAnalytics,
      ruleParams,
      accumulator,
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      NEW_TERMS_FIELD_CARDINALITY_EVENT.eventType,
      {
        isElasticRule: false,
        newTermsFieldsCount: 2,
        distinctFieldCombinations: 0,
        maxCombinationValueLength: 0,
        avgCombinationValueLength: 0,
        completedFullScan: false,
      }
    );
  });

  it('should default newTermsFieldsCount to 0 when the field list is missing', () => {
    const accumulator = createNewTermsFieldCardinalityAccumulator();
    const ruleParams = {
      type: 'new_terms',
      immutable: false,
    } as NewTermsRuleParams;

    sendNewTermsFieldCardinalityTelemetryEvent({
      analytics: mockAnalytics,
      ruleParams,
      accumulator,
    });

    expect(mockAnalytics.reportEvent).toHaveBeenCalledWith(
      NEW_TERMS_FIELD_CARDINALITY_EVENT.eventType,
      expect.objectContaining({ newTermsFieldsCount: 0 })
    );
  });

  it('should not report anything when the accumulator is in an error state', () => {
    const accumulator = createNewTermsFieldCardinalityAccumulator();
    accumulator.hasError = true;

    const ruleParams = {
      type: 'new_terms',
      immutable: true,
      newTermsFields: ['host.name'],
    } as NewTermsRuleParams;

    sendNewTermsFieldCardinalityTelemetryEvent({
      analytics: mockAnalytics,
      ruleParams,
      accumulator,
    });

    expect(mockAnalytics.reportEvent).not.toHaveBeenCalled();
  });
});
