/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { EcsVersion } from '@elastic/ecs';
import { isEmpty } from 'lodash/fp';
import { IToasts } from '@kbn/core-notifications-browser';
import { HttpHandler } from '@kbn/core-http-browser';

import {
  getTotalDocsCount,
  getTotalIncompatible,
  getTotalIndices,
  getTotalIndicesChecked,
  getTotalSameFamily,
  getTotalSizeInBytes,
  getTotalPatternSameFamily,
  getIndexId,
} from './utils/stats';
import { postStorageResult, formatStorageResult } from './utils/storage';
import { getPatternRollupsWithLatestCheckResult } from './utils/get_pattern_rollups_with_latest_check_result';
import type { OnCheckCompleted, PatternRollup, TelemetryEvents } from '../../types';
import {
  getEscapedIncompatibleMappingsFields,
  getEscapedIncompatibleValuesFields,
  getEscapedSameFamilyFields,
} from './utils/metadata';
import { UseResultsRollupReturnValue } from './types';
import { getDocsCount, getIndexIncompatible, getSizeInBytes } from '../../utils/stats';
import { getIlmPhase } from '../../utils/get_ilm_phase';
import { useStoredPatternResults } from './hooks/use_stored_pattern_results';

interface Props {
  patterns: string[];
  toasts: IToasts;
  httpFetch: HttpHandler;
  telemetryEvents: TelemetryEvents;
  isILMAvailable: boolean;
  startTime: string;
  endTime: string;
}
export const useResultsRollup = ({
  httpFetch,
  toasts,
  patterns,
  isILMAvailable,
  telemetryEvents,
  startTime,
  endTime,
}: Props): UseResultsRollupReturnValue => {
  const [patternIndexNames, setPatternIndexNames] = useState<Record<string, string[]>>({});
  const [patternRollups, setPatternRollups] = useState<Record<string, PatternRollup>>({});

  const storedPatternsResults = useStoredPatternResults({
    httpFetch,
    patterns,
    toasts,
    isILMAvailable,
    startTime,
    endTime,
  });

  useEffect(() => {
    if (!isEmpty(storedPatternsResults)) {
      setPatternRollups((current) =>
        storedPatternsResults.reduce(
          (acc, { pattern, results }) => ({
            ...acc,
            [pattern]: {
              ...current[pattern],
              pattern,
              results,
            },
          }),
          current
        )
      );
    }
  }, [storedPatternsResults]);

  const updatePatternRollup = useCallback((patternRollup: PatternRollup) => {
    setPatternRollups((current) => ({
      ...current,
      [patternRollup.pattern]: {
        ...patternRollup,
        results: patternRollup.results ?? current[patternRollup.pattern]?.results, // prevent undefined results override existing
      },
    }));
  }, []);

  const totalDocsCount = useMemo(() => getTotalDocsCount(patternRollups), [patternRollups]);
  const totalIncompatible = useMemo(() => getTotalIncompatible(patternRollups), [patternRollups]);
  const totalIndices = useMemo(() => getTotalIndices(patternRollups), [patternRollups]);
  const totalIndicesChecked = useMemo(
    () => getTotalIndicesChecked(patternRollups),
    [patternRollups]
  );
  const totalSameFamily = useMemo(() => getTotalSameFamily(patternRollups), [patternRollups]);
  const totalSizeInBytes = useMemo(() => getTotalSizeInBytes(patternRollups), [patternRollups]);

  const updatePatternIndexNames = useCallback(
    ({ indexNames, pattern }: { indexNames: string[]; pattern: string }) => {
      setPatternIndexNames((current) => ({ ...current, [pattern]: indexNames }));
    },
    []
  );

  const onCheckCompleted: OnCheckCompleted = useCallback(
    ({
      batchId,
      checkAllStartTime,
      error,
      formatBytes,
      formatNumber,
      indexName,
      partitionedFieldMetadata,
      pattern,
      requestTime,
      isLastCheck,
      isCheckAll,
    }) => {
      setPatternRollups((currentPatternRollups) => {
        const updatedRollups = getPatternRollupsWithLatestCheckResult({
          error,
          formatBytes,
          formatNumber,
          indexName,
          isILMAvailable,
          partitionedFieldMetadata,
          pattern,
          patternRollups: currentPatternRollups,
        });

        const updatedRollup = updatedRollups[pattern];
        const { stats, results, ilmExplain } = updatedRollup;
        const indexId = getIndexId({ indexName, stats });

        if (
          stats &&
          results &&
          requestTime != null &&
          requestTime > 0 &&
          partitionedFieldMetadata
        ) {
          const report = {
            batchId,
            ecsVersion: EcsVersion,
            errorCount: error ? 1 : 0,
            ilmPhase: getIlmPhase(ilmExplain?.[indexName], isILMAvailable),
            indexId,
            indexName,
            isCheckAll,
            numberOfDocuments: getDocsCount({ indexName, stats }),
            numberOfFields: partitionedFieldMetadata.all.length,
            numberOfIncompatibleFields: getIndexIncompatible({
              indexName,
              results,
            }),
            numberOfEcsFields: partitionedFieldMetadata.ecsCompliant.length,
            numberOfCustomFields: partitionedFieldMetadata.custom.length,
            numberOfIndices: 1,
            numberOfIndicesChecked: 1,
            numberOfSameFamily: getTotalPatternSameFamily(results),
            sameFamilyFields: getEscapedSameFamilyFields(partitionedFieldMetadata.sameFamily),
            sizeInBytes: getSizeInBytes({ stats, indexName }),
            timeConsumedMs: requestTime,
            unallowedMappingFields: getEscapedIncompatibleMappingsFields(
              partitionedFieldMetadata.incompatible
            ),
            unallowedValueFields: getEscapedIncompatibleValuesFields(
              partitionedFieldMetadata.incompatible
            ),
          };
          telemetryEvents.reportDataQualityIndexChecked?.(report);

          const result = results[indexName];
          if (result) {
            const storageResult = formatStorageResult({ result, report, partitionedFieldMetadata });
            postStorageResult({ storageResult, httpFetch, toasts });
          }
        }

        if (isLastCheck) {
          telemetryEvents.reportDataQualityCheckAllCompleted?.({
            batchId,
            ecsVersion: EcsVersion,
            isCheckAll: true,
            numberOfDocuments: getTotalDocsCount(updatedRollups),
            numberOfIncompatibleFields: getTotalIncompatible(updatedRollups),
            numberOfIndices: getTotalIndices(updatedRollups),
            numberOfIndicesChecked: getTotalIndicesChecked(updatedRollups),
            numberOfSameFamily: getTotalSameFamily(updatedRollups),
            sizeInBytes: getTotalSizeInBytes(updatedRollups),
            timeConsumedMs: Date.now() - checkAllStartTime,
          });
        }
        return updatedRollups;
      });
    },
    [httpFetch, isILMAvailable, telemetryEvents, toasts]
  );

  const useResultsRollupReturnValue = useMemo(
    () => ({
      onCheckCompleted,
      patternIndexNames,
      patternRollups,
      totalDocsCount,
      totalIncompatible,
      totalIndices,
      totalIndicesChecked,
      totalSameFamily,
      totalSizeInBytes,
      updatePatternIndexNames,
      updatePatternRollup,
    }),
    [
      onCheckCompleted,
      patternIndexNames,
      patternRollups,
      totalDocsCount,
      totalIncompatible,
      totalIndices,
      totalIndicesChecked,
      totalSameFamily,
      totalSizeInBytes,
      updatePatternIndexNames,
      updatePatternRollup,
    ]
  );

  return useResultsRollupReturnValue;
};
