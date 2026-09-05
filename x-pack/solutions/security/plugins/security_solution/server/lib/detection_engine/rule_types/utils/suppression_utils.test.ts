/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ALERT_SUPPRESSION_DOCS_COUNT,
  ALERT_INSTANCE_ID,
  ALERT_SUPPRESSION_TERMS,
  ALERT_SUPPRESSION_START,
  ALERT_SUPPRESSION_END,
} from '@kbn/rule-data-utils';

import {
  getSuppressionTerms,
  getSuppressionAlertFields,
  getEqlSequenceSuppressionTerms,
  eqlSequenceHasAllSuppressionFieldValues,
} from './suppression_utils';

describe('getSuppressionAlertFields', () => {
  const suppressionTerms = [
    {
      field: 'agent.name',
      value: ['agent-0'],
    },
  ];
  const instanceId = 'mock-id';
  const fallbackTimestamp = '2020-10-28T06:30:00.000Z';
  const expectedTimestamp = '2022-02-24T06:30:00.000Z';

  it('should return suppression fields', () => {
    expect(
      getSuppressionAlertFields({
        primaryTimestamp: '@timestamp',
        fields: { '@timestamp': expectedTimestamp },
        suppressionTerms,
        instanceId,
        fallbackTimestamp,
      })
    ).toEqual({
      [ALERT_SUPPRESSION_TERMS]: suppressionTerms,
      [ALERT_SUPPRESSION_START]: new Date(expectedTimestamp),
      [ALERT_SUPPRESSION_END]: new Date(expectedTimestamp),
      [ALERT_SUPPRESSION_DOCS_COUNT]: 0,
      [ALERT_INSTANCE_ID]: instanceId,
    });
  });
  it('should set suppression boundaries from secondary timestamp field', () => {
    expect(
      getSuppressionAlertFields({
        primaryTimestamp: '@timestamp',
        secondaryTimestamp: 'event.ingested',
        fields: { 'event.ingested': expectedTimestamp },
        suppressionTerms,
        instanceId,
        fallbackTimestamp,
      })
    ).toEqual(
      expect.objectContaining({
        [ALERT_SUPPRESSION_START]: new Date(expectedTimestamp),
        [ALERT_SUPPRESSION_END]: new Date(expectedTimestamp),
      })
    );
  });
  it('should set suppression boundaries from fallback timestamp', () => {
    expect(
      getSuppressionAlertFields({
        primaryTimestamp: '@timestamp',
        secondaryTimestamp: 'event.ingested',
        fields: {},
        suppressionTerms,
        instanceId,
        fallbackTimestamp,
      })
    ).toEqual(
      expect.objectContaining({
        [ALERT_SUPPRESSION_START]: new Date(fallbackTimestamp),
        [ALERT_SUPPRESSION_END]: new Date(fallbackTimestamp),
      })
    );
  });
});

describe('getSuppressionTerms', () => {
  it('should return suppression terms', () => {
    expect(
      getSuppressionTerms({
        alertSuppression: {
          groupBy: ['host.name'],
        },
        input: { 'host.name': 'localhost-1' },
      })
    ).toEqual([{ field: 'host.name', value: 'localhost-1' }]);
  });
  it('should return suppression terms when using source', () => {
    expect(
      getSuppressionTerms({
        alertSuppression: {
          groupBy: ['host.name'],
        },
        input: { host: { name: 'localhost-1' } },
      })
    ).toEqual([{ field: 'host.name', value: 'localhost-1' }]);
  });
  it('should return suppression terms when using source and mixed notation', () => {
    expect(
      getSuppressionTerms({
        alertSuppression: {
          groupBy: ['host.something.name'],
        },
        input: { 'host.something': { name: 'localhost-1' } },
      })
    ).toEqual([{ field: 'host.something.name', value: 'localhost-1' }]);
  });
  it('should return suppression terms array when fields do not have matches', () => {
    expect(
      getSuppressionTerms({
        alertSuppression: {
          groupBy: ['host.name'],
        },
        input: { 'host.ip': '127.0.0.1' },
      })
    ).toEqual([{ field: 'host.name', value: null }]);
  });
  it('should return sorted suppression terms array value', () => {
    expect(
      getSuppressionTerms({
        alertSuppression: {
          groupBy: ['host.name'],
        },
        input: { 'host.name': ['localhost-2', 'localhost-1'] },
      })
    ).toEqual([{ field: 'host.name', value: ['localhost-1', 'localhost-2'] }]);
  });
  it('should return multiple suppression terms', () => {
    expect(
      getSuppressionTerms({
        alertSuppression: {
          groupBy: ['host.name', 'host.ip'],
        },
        input: { 'host.name': ['localhost-1'], 'agent.name': 'test', 'host.ip': '127.0.0.1' },
      })
    ).toEqual([
      { field: 'host.name', value: ['localhost-1'] },
      { field: 'host.ip', value: '127.0.0.1' },
    ]);
  });
  it('should use groupByV2 fields when configured', () => {
    expect(
      getSuppressionTerms({
        alertSuppression: {
          groupByV2: [{ field: 'host.name' }],
        },
        input: { 'host.name': 'localhost-1' },
      })
    ).toEqual([{ field: 'host.name', value: 'localhost-1' }]);
  });
});

describe('getEqlSequenceSuppressionTerms', () => {
  it('reads fields from the shell document when sequence_index is omitted', () => {
    expect(
      getEqlSequenceSuppressionTerms({
        alertSuppression: { groupByV2: [{ field: 'host.name' }] },
        shellAlertSource: { 'host.name': 'shell-host' },
        buildingBlockSources: [{ 'host.name': 'bb0' }, { 'host.name': 'bb1' }],
      })
    ).toEqual([{ field: 'host.name', value: 'shell-host' }]);
  });

  it('reads fields from the building block at sequence_index', () => {
    expect(
      getEqlSequenceSuppressionTerms({
        alertSuppression: {
          groupByV2: [
            { field: 'host.name', sequence_index: 0 },
            { field: 'user.name', sequence_index: 1 },
          ],
        },
        shellAlertSource: {},
        buildingBlockSources: [
          { 'host.name': 'h0', 'user.name': 'ignored' },
          { 'host.name': 'ignored', 'user.name': 'u1' },
        ],
      })
    ).toEqual([
      { field: 'host.name', value: 'h0' },
      { field: 'user.name', value: 'u1' },
    ]);
  });

  it('falls back to getSuppressionTerms when only legacy groupBy is set', () => {
    expect(
      getEqlSequenceSuppressionTerms({
        alertSuppression: { groupBy: ['host.name'] },
        shellAlertSource: { 'host.name': 'legacy' },
        buildingBlockSources: [],
      })
    ).toEqual([{ field: 'host.name', value: 'legacy' }]);
  });

  it('reads sequenceIndex (camelCase) emitted by convertObjectKeysToCamelCase', () => {
    expect(
      getEqlSequenceSuppressionTerms({
        // Once `alert_suppression` is converted to camelCase at the rule-execution boundary,
        // each entry carries `sequenceIndex` instead of the original `sequence_index`.
        alertSuppression: {
          groupByV2: [
            { field: 'host.name', sequenceIndex: 0 },
            { field: 'user.name', sequenceIndex: 1 },
          ] as unknown as Array<{
            field: string;
            sequence_index?: number;
          }>,
        },
        shellAlertSource: {},
        buildingBlockSources: [
          { 'host.name': 'h0', 'user.name': 'ignored' },
          { 'host.name': 'ignored', 'user.name': 'u1' },
        ],
      })
    ).toEqual([
      { field: 'host.name', value: 'h0' },
      { field: 'user.name', value: 'u1' },
    ]);
  });
});

describe('eqlSequenceHasAllSuppressionFieldValues', () => {
  it('requires values on the correct sequence document for groupByV2', () => {
    expect(
      eqlSequenceHasAllSuppressionFieldValues({
        alertSuppression: { groupByV2: [{ field: 'host.name', sequence_index: 1 }] },
        shellAlertSource: { 'host.name': 'only-on-shell' },
        buildingBlockSources: [{}, { 'host.name': 'on-bb1' }],
      })
    ).toBe(true);

    expect(
      eqlSequenceHasAllSuppressionFieldValues({
        alertSuppression: { groupByV2: [{ field: 'host.name', sequence_index: 1 }] },
        shellAlertSource: { 'host.name': 'only-on-shell' },
        buildingBlockSources: [{}, {}],
      })
    ).toBe(false);
  });
});
