/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// fixing timezone for Date
// so when tests are run in different timezones, the results are consistent
process.env.TZ = 'UTC';

import { renderHook, act } from '@testing-library/react';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

import type { TelemetryEvents } from '../../types';
import { useStoredPatternResults } from './hooks/use_stored_pattern_results';
import { mockPartitionedFieldMetadata } from '../../mock/partitioned_field_metadata/mock_partitioned_field_metadata';
import { useResultsRollup } from '.';
import { getPatternRollupStub } from '../../stub/get_pattern_rollup_stub';
import { formatBytes, formatNumber } from '../../mock/test_providers/utils/format';

jest.mock('./hooks/use_stored_pattern_results', () => ({
  ...jest.requireActual('./hooks/use_stored_pattern_results'),
  useStoredPatternResults: jest.fn().mockReturnValue([]),
}));

describe('useResultsRollup', () => {
  const httpFetch = jest.fn();
  const toasts = notificationServiceMock.createStartContract().toasts;

  const mockTelemetryEvents: TelemetryEvents = {
    reportDataQualityIndexChecked: jest.fn(),
    reportDataQualityCheckAllCompleted: jest.fn(),
  };

  const patterns = ['auditbeat-*', 'packetbeat-*'];
  const isILMAvailable = true;
  const startTime = 'now-7d';
  const endTime = 'now';

  const useStoredPatternResultsMock = useStoredPatternResults as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useStoredPatternResultsMock.mockReturnValue([]);
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() =>
        useResultsRollup({
          httpFetch,
          toasts,
          patterns,
          isILMAvailable,
          telemetryEvents: mockTelemetryEvents,
          startTime,
          endTime,
        })
      );

      expect(result.current.patternIndexNames).toEqual({});
      expect(result.current.patternRollups).toEqual({});
      expect(result.current.totalDocsCount).toBe(0);
      expect(result.current.totalIncompatible).toBeUndefined();
      expect(result.current.totalIndices).toBe(0);
      expect(result.current.totalIndicesChecked).toBe(0);
      expect(result.current.totalSameFamily).toBeUndefined();
      expect(result.current.totalSizeInBytes).toBe(0);
    });

    it('should fetch stored pattern results and update patternRollups from it', () => {
      const mockStoredResults = [
        {
          pattern: 'auditbeat-*',
          results: {
            'auditbeat-7.11.0-2021.01.01': {
              indexName: 'auditbeat-7.11.0-2021.01.01',
              pattern: 'auditbeat-*',
              docsCount: 500,
              incompatible: 0,
              error: null,
              ilmPhase: 'hot',
              sameFamily: 0,
              markdownComments: [],
              checkedAt: Date.now(),
            },
          },
        },
      ];

      useStoredPatternResultsMock.mockReturnValue(mockStoredResults);

      const { result } = renderHook(() =>
        useResultsRollup({
          httpFetch,
          toasts,
          patterns: ['auditbeat-*'],
          isILMAvailable,
          telemetryEvents: mockTelemetryEvents,
          startTime,
          endTime,
        })
      );

      expect(useStoredPatternResultsMock).toHaveBeenCalledWith({
        patterns: ['auditbeat-*'],
        toasts,
        httpFetch,
        isILMAvailable,
        startTime,
        endTime,
      });

      expect(result.current.patternRollups).toEqual({
        'auditbeat-*': {
          pattern: 'auditbeat-*',
          results: {
            'auditbeat-7.11.0-2021.01.01': expect.any(Object),
          },
        },
      });
    });
  });

  describe('updatePatternIndexNames', () => {
    it('should update pattern index names', () => {
      const { result } = renderHook(() =>
        useResultsRollup({
          httpFetch,
          toasts,
          patterns,
          isILMAvailable,
          telemetryEvents: mockTelemetryEvents,
          startTime,
          endTime,
        })
      );

      act(() => {
        result.current.updatePatternIndexNames({
          pattern: 'packetbeat-*',
          indexNames: ['packetbeat-7.10.0-2021.01.01'],
        });
      });

      expect(result.current.patternIndexNames).toEqual({
        'packetbeat-*': ['packetbeat-7.10.0-2021.01.01'],
      });
    });
  });

  describe('updatePatternRollup', () => {
    it('should update pattern rollup when called', () => {
      const { result } = renderHook(() =>
        useResultsRollup({
          httpFetch,
          toasts,
          patterns,
          isILMAvailable,
          telemetryEvents: mockTelemetryEvents,
          startTime,
          endTime,
        })
      );

      const patternRollup = getPatternRollupStub('packetbeat-*', 1);

      expect(result.current.patternRollups).toEqual({});

      act(() => {
        result.current.updatePatternRollup(patternRollup);
      });

      expect(result.current.patternRollups).toEqual({
        'packetbeat-*': patternRollup,
      });
    });
  });

  describe('onCheckCompleted', () => {
    describe('when invoked with successful check data', () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2021-10-07T00:00:00Z').getTime());
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('should update patternRollup with said data, report to telemetry and persist it in storage', () => {
        const { result } = renderHook(() =>
          useResultsRollup({
            httpFetch,
            toasts,
            patterns,
            isILMAvailable,
            telemetryEvents: mockTelemetryEvents,
            startTime,
            endTime,
          })
        );

        const patternRollup = getPatternRollupStub('packetbeat-*', 1);

        act(() => {
          result.current.updatePatternRollup(patternRollup);
        });

        expect(result.current.patternRollups['packetbeat-*'].results?.['.ds-packetbeat-1']).toEqual(
          {
            checkedAt: new Date('2021-10-07T00:00:00Z').getTime(),
            docsCount: 1000000,
            error: null,
            ilmPhase: 'hot',
            incompatible: 0,
            indexName: '.ds-packetbeat-1',
            markdownComments: ['foo', 'bar', 'baz'],
            pattern: 'packetbeat-*',
            sameFamily: 0,
          }
        );

        jest.advanceTimersByTime(1000);

        const mockOnCheckCompletedOpts = {
          batchId: 'test-batch',
          checkAllStartTime: Date.now(),
          error: null,
          formatBytes,
          formatNumber,
          indexName: '.ds-packetbeat-1',
          partitionedFieldMetadata: mockPartitionedFieldMetadata,
          pattern: 'packetbeat-*',
          requestTime: 1500,
          isLastCheck: true,
          isCheckAll: true,
        };

        jest.advanceTimersByTime(1000);

        act(() => {
          result.current.onCheckCompleted(mockOnCheckCompletedOpts);
        });

        expect(result.current.patternRollups['packetbeat-*'].results?.['.ds-packetbeat-1']).toEqual(
          {
            checkedAt: new Date('2021-10-07T00:00:02Z').getTime(),
            docsCount: 1000000,
            error: null,
            ilmPhase: 'hot',
            incompatible: 3,
            indexName: '.ds-packetbeat-1',
            markdownComments: expect.any(Array),
            pattern: 'packetbeat-*',
            sameFamily: 0,
          }
        );

        expect(mockTelemetryEvents.reportDataQualityIndexChecked).toHaveBeenCalledWith({
          batchId: 'test-batch',
          ecsVersion: '8.11.0',
          errorCount: 0,
          ilmPhase: 'hot',
          indexId: 'uuid-1',
          indexName: '.ds-packetbeat-1',
          isCheckAll: true,
          numberOfCustomFields: 4,
          numberOfDocuments: 1000000,
          numberOfEcsFields: 2,
          numberOfFields: 9,
          numberOfIncompatibleFields: 3,
          numberOfIndices: 1,
          numberOfIndicesChecked: 1,
          numberOfSameFamily: 0,
          sameFamilyFields: [],
          sizeInBytes: 500000000,
          timeConsumedMs: 1500,
          unallowedMappingFields: ['host.name', 'source.ip'],
          unallowedValueFields: ['event.category'],
        });
        expect(mockTelemetryEvents.reportDataQualityCheckAllCompleted).toHaveBeenCalledWith({
          batchId: 'test-batch',
          ecsVersion: '8.11.0',
          isCheckAll: true,
          numberOfDocuments: 1000000,
          numberOfIncompatibleFields: 3,
          numberOfIndices: 1,
          numberOfIndicesChecked: 1,
          numberOfSameFamily: 0,
          sizeInBytes: 500000000,
          timeConsumedMs: 1000,
        });

        expect(httpFetch).toHaveBeenCalledWith('/internal/ecs_data_quality_dashboard/results', {
          method: 'POST',
          version: '1',
          signal: expect.any(AbortSignal),
          body: expect.any(String),
        });

        const body = JSON.parse(httpFetch.mock.calls[0][1].body);

        expect(body).toEqual({
          batchId: 'test-batch',
          indexName: '.ds-packetbeat-1',
          indexPattern: 'packetbeat-*',
          isCheckAll: true,
          checkedAt: new Date('2021-10-07T00:00:02Z').getTime(),
          docsCount: 1000000,
          totalFieldCount: 9,
          ecsFieldCount: 2,
          customFieldCount: 4,
          incompatibleFieldCount: 3,
          incompatibleFieldMappingItems: [
            {
              fieldName: 'host.name',
              expectedValue: 'keyword',
              actualValue: 'text',
              description:
                'Name of the host.\nIt can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
            },
            {
              fieldName: 'source.ip',
              expectedValue: 'ip',
              actualValue: 'text',
              description: 'IP address of the source (IPv4 or IPv6).',
            },
          ],
          incompatibleFieldValueItems: [
            {
              fieldName: 'event.category',
              expectedValues: [
                'authentication',
                'configuration',
                'database',
                'driver',
                'email',
                'file',
                'host',
                'iam',
                'intrusion_detection',
                'malware',
                'network',
                'package',
                'process',
                'registry',
                'session',
                'threat',
                'vulnerability',
                'web',
              ],
              actualValues: [
                { name: 'an_invalid_category', count: 2 },
                { name: 'theory', count: 1 },
              ],
              description:
                'This is one of four ECS Categorization Fields, and indicates the second level in the ECS category hierarchy.\n`event.category` represents the "big buckets" of ECS categories. For example, filtering on `event.category:process` yields all events relating to process activity. This field is closely related to `event.type`, which is used as a subcategory.\nThis field is an array. This will allow proper categorization of some events that fall in multiple categories.',
            },
          ],
          sameFamilyFieldCount: 0,
          sameFamilyFields: [],
          sameFamilyFieldItems: [],
          unallowedMappingFields: ['host.name', 'source.ip'],
          unallowedValueFields: ['event.category'],
          sizeInBytes: 500000000,
          ilmPhase: 'hot',
          markdownComments: [
            '### .ds-packetbeat-1\n',
            '| Result | Index | Docs | Incompatible fields | ILM Phase | Size |\n|--------|-------|------|---------------------|-----------|------|\n| ❌ | .ds-packetbeat-1 | 1,000,000 (100.0%) | 3 | `hot` | 476.8MB |\n\n',
            '### **Incompatible fields** `3` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
            "#### 3 incompatible fields\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version 8.11.0.\n\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n",
            '\n#### Incompatible field mappings - .ds-packetbeat-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text` |\n| source.ip | `ip` | `text` |\n\n#### Incompatible field values - .ds-packetbeat-1\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2), `theory` (1) |\n\n',
          ],
          ecsVersion: '8.11.0',
          indexId: 'uuid-1',
          error: null,
        });
      });

      describe('when isILMAvailable is false', () => {
        it('should omit ilmPhase and nullify sizeInBytes when storing payload', () => {
          const { result } = renderHook(() =>
            useResultsRollup({
              httpFetch,
              toasts,
              patterns,
              isILMAvailable: false,
              telemetryEvents: mockTelemetryEvents,
              startTime,
              endTime,
            })
          );

          const patternRollup = getPatternRollupStub('packetbeat-*', 1, false);

          act(() => {
            result.current.updatePatternRollup(patternRollup);
          });

          jest.advanceTimersByTime(1000);

          const mockOnCheckCompletedOpts = {
            batchId: 'test-batch',
            checkAllStartTime: Date.now(),
            error: null,
            formatBytes,
            formatNumber,
            indexName: '.ds-packetbeat-1',
            partitionedFieldMetadata: mockPartitionedFieldMetadata,
            pattern: 'packetbeat-*',
            requestTime: 1500,
            isLastCheck: true,
            isCheckAll: true,
          };

          jest.advanceTimersByTime(1000);

          act(() => {
            result.current.onCheckCompleted(mockOnCheckCompletedOpts);
          });

          expect(mockTelemetryEvents.reportDataQualityIndexChecked).toHaveBeenCalledWith({
            batchId: 'test-batch',
            ecsVersion: '8.11.0',
            errorCount: 0,
            ilmPhase: undefined,
            indexId: 'uuid-1',
            indexName: '.ds-packetbeat-1',
            isCheckAll: true,
            numberOfCustomFields: 4,
            numberOfDocuments: 1000000,
            numberOfEcsFields: 2,
            numberOfFields: 9,
            numberOfIncompatibleFields: 3,
            numberOfIndices: 1,
            numberOfIndicesChecked: 1,
            numberOfSameFamily: 0,
            sameFamilyFields: [],
            sizeInBytes: undefined,
            timeConsumedMs: 1500,
            unallowedMappingFields: ['host.name', 'source.ip'],
            unallowedValueFields: ['event.category'],
          });
          expect(mockTelemetryEvents.reportDataQualityCheckAllCompleted).toHaveBeenCalledWith({
            batchId: 'test-batch',
            ecsVersion: '8.11.0',
            isCheckAll: true,
            numberOfDocuments: 1000000,
            numberOfIncompatibleFields: 3,
            numberOfIndices: 1,
            numberOfIndicesChecked: 1,
            numberOfSameFamily: 0,
            sizeInBytes: undefined,
            timeConsumedMs: 1000,
          });

          expect(httpFetch).toHaveBeenCalledWith('/internal/ecs_data_quality_dashboard/results', {
            method: 'POST',
            version: '1',
            signal: expect.any(AbortSignal),
            body: expect.any(String),
          });

          const body = JSON.parse(httpFetch.mock.calls[0][1].body);

          expect(body).toEqual({
            batchId: 'test-batch',
            indexName: '.ds-packetbeat-1',
            indexPattern: 'packetbeat-*',
            isCheckAll: true,
            checkedAt: new Date('2021-10-07T00:00:02Z').getTime(),
            docsCount: 1000000,
            totalFieldCount: 9,
            ecsFieldCount: 2,
            customFieldCount: 4,
            incompatibleFieldCount: 3,
            incompatibleFieldMappingItems: [
              {
                fieldName: 'host.name',
                expectedValue: 'keyword',
                actualValue: 'text',
                description:
                  'Name of the host.\nIt can contain what `hostname` returns on Unix systems, the fully qualified domain name, or a name specified by the user. The sender decides which value to use.',
              },
              {
                fieldName: 'source.ip',
                expectedValue: 'ip',
                actualValue: 'text',
                description: 'IP address of the source (IPv4 or IPv6).',
              },
            ],
            incompatibleFieldValueItems: [
              {
                fieldName: 'event.category',
                expectedValues: [
                  'authentication',
                  'configuration',
                  'database',
                  'driver',
                  'email',
                  'file',
                  'host',
                  'iam',
                  'intrusion_detection',
                  'malware',
                  'network',
                  'package',
                  'process',
                  'registry',
                  'session',
                  'threat',
                  'vulnerability',
                  'web',
                ],
                actualValues: [
                  { name: 'an_invalid_category', count: 2 },
                  { name: 'theory', count: 1 },
                ],
                description:
                  'This is one of four ECS Categorization Fields, and indicates the second level in the ECS category hierarchy.\n`event.category` represents the "big buckets" of ECS categories. For example, filtering on `event.category:process` yields all events relating to process activity. This field is closely related to `event.type`, which is used as a subcategory.\nThis field is an array. This will allow proper categorization of some events that fall in multiple categories.',
              },
            ],
            sameFamilyFieldCount: 0,
            sameFamilyFields: [],
            sameFamilyFieldItems: [],
            unallowedMappingFields: ['host.name', 'source.ip'],
            unallowedValueFields: ['event.category'],
            ilmPhase: undefined,
            sizeInBytes: 0,
            markdownComments: [
              '### .ds-packetbeat-1\n',
              '| Result | Index | Docs | Incompatible fields |\n|--------|-------|------|---------------------|\n| ❌ | .ds-packetbeat-1 | 1,000,000 (100.0%) | 3 |\n\n',
              '### **Incompatible fields** `3` **Same family** `0` **Custom fields** `4` **ECS compliant fields** `2` **All fields** `9`\n',
              "#### 3 incompatible fields\n\nFields are incompatible with ECS when index mappings, or the values of the fields in the index, don't conform to the Elastic Common Schema (ECS), version 8.11.0.\n\n❌ Detection engine rules referencing these fields may not match them correctly\n❌ Pages may not display some events or fields due to unexpected field mappings or values\n❌ Mappings or field values that don't comply with ECS are not supported\n",
              '\n#### Incompatible field mappings - .ds-packetbeat-1\n\n\n| Field | ECS mapping type (expected) | Index mapping type (actual) | \n|-------|-----------------------------|-----------------------------|\n| host.name | `keyword` | `text` |\n| source.ip | `ip` | `text` |\n\n#### Incompatible field values - .ds-packetbeat-1\n\n\n| Field | ECS values (expected) | Document values (actual) | \n|-------|-----------------------|--------------------------|\n| event.category | `authentication`, `configuration`, `database`, `driver`, `email`, `file`, `host`, `iam`, `intrusion_detection`, `malware`, `network`, `package`, `process`, `registry`, `session`, `threat`, `vulnerability`, `web` | `an_invalid_category` (2), `theory` (1) |\n\n',
            ],
            ecsVersion: '8.11.0',
            indexId: 'uuid-1',
            error: null,
          });
        });
      });
    });

    describe('when check fails with error message and no partitionedFieldMetadata', () => {
      it('should update patternRollup with error message, reset state without persisting in storage', () => {
        const { result } = renderHook(() =>
          useResultsRollup({
            httpFetch,
            toasts,
            patterns,
            isILMAvailable,
            telemetryEvents: mockTelemetryEvents,
            startTime,
            endTime,
          })
        );

        const patternRollup = getPatternRollupStub('packetbeat-*', 1);

        act(() => {
          result.current.updatePatternRollup(patternRollup);
        });

        const mockOnCheckCompletedOpts = {
          batchId: 'test-batch',
          checkAllStartTime: Date.now(),
          error: 'Something went wrong',
          formatBytes,
          formatNumber,
          indexName: '.ds-packetbeat-1',
          partitionedFieldMetadata: null,
          pattern: 'packetbeat-*',
          requestTime: 1500,
          isLastCheck: true,
          isCheckAll: true,
        };

        act(() => {
          result.current.onCheckCompleted(mockOnCheckCompletedOpts);
        });

        expect(result.current.patternRollups['packetbeat-*'].results?.['.ds-packetbeat-1']).toEqual(
          {
            checkedAt: undefined,
            docsCount: 1000000,
            error: 'Something went wrong',
            ilmPhase: 'hot',
            incompatible: undefined,
            indexName: '.ds-packetbeat-1',
            markdownComments: expect.any(Array),
            pattern: 'packetbeat-*',
            sameFamily: undefined,
          }
        );

        expect(mockTelemetryEvents.reportDataQualityIndexChecked).not.toHaveBeenCalled();

        expect(httpFetch).not.toHaveBeenCalledWith(
          '/internal/ecs_data_quality_dashboard/results',
          expect.any(Object)
        );
      });
    });

    describe('edge cases', () => {
      describe('given no error nor partitionedFieldMetadata', () => {
        it('should reset result state accordingly and not invoke telemetry report nor persist in storage', () => {
          const { result } = renderHook(() =>
            useResultsRollup({
              httpFetch,
              toasts,
              patterns,
              isILMAvailable,
              telemetryEvents: mockTelemetryEvents,
              startTime,
              endTime,
            })
          );

          const patternRollup = getPatternRollupStub('packetbeat-*', 1);

          act(() => {
            result.current.updatePatternRollup(patternRollup);
          });

          const mockOnCheckCompletedOpts = {
            batchId: 'test-batch',
            checkAllStartTime: Date.now(),
            error: null,
            formatBytes,
            formatNumber,
            indexName: '.ds-packetbeat-1',
            partitionedFieldMetadata: null,
            pattern: 'packetbeat-*',
            requestTime: 1500,
            isLastCheck: true,
            isCheckAll: true,
          };

          act(() => {
            result.current.onCheckCompleted(mockOnCheckCompletedOpts);
          });

          expect(
            result.current.patternRollups['packetbeat-*'].results?.['.ds-packetbeat-1']
          ).toEqual({
            checkedAt: undefined,
            docsCount: 1000000,
            error: null,
            ilmPhase: 'hot',
            incompatible: undefined,
            indexName: '.ds-packetbeat-1',
            markdownComments: expect.any(Array),
            pattern: 'packetbeat-*',
            sameFamily: undefined,
          });

          expect(mockTelemetryEvents.reportDataQualityIndexChecked).not.toHaveBeenCalled();

          expect(httpFetch).not.toHaveBeenCalledWith(
            '/internal/ecs_data_quality_dashboard/results',
            expect.any(Object)
          );
        });
      });
    });
  });

  describe('calculating totals', () => {
    describe('when patternRollups change', () => {
      it('should update totals', () => {
        const { result } = renderHook(() =>
          useResultsRollup({
            httpFetch,
            toasts,
            patterns: ['packetbeat-*', 'auditbeat-*'],
            isILMAvailable,
            telemetryEvents: mockTelemetryEvents,
            startTime,
            endTime,
          })
        );

        const patternRollup1 = getPatternRollupStub('packetbeat-*', 1);
        const patternRollup2 = getPatternRollupStub('auditbeat-*', 1);

        expect(result.current.totalIndices).toBe(0);
        expect(result.current.totalDocsCount).toBe(0);
        expect(result.current.totalSizeInBytes).toBe(0);

        act(() => {
          result.current.updatePatternRollup(patternRollup1);
        });

        expect(result.current.totalIndices).toEqual(1);
        expect(result.current.totalDocsCount).toEqual(1000000);
        expect(result.current.totalSizeInBytes).toEqual(500000000);

        act(() => {
          result.current.updatePatternRollup(patternRollup2);
        });

        expect(result.current.totalIndices).toEqual(2);
        expect(result.current.totalDocsCount).toEqual(2000000);
        expect(result.current.totalSizeInBytes).toEqual(1000000000);
      });
    });
  });
});
