/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { v4 as uuidv4 } from 'uuid';
import { formatNumber } from '@elastic/eui';
import { EcsVersion } from '@elastic/ecs';
import {
  checkIndex,
  type PartitionedFieldMetadata,
  type UnallowedValueCount,
  type AllowedValue,
  type IncompatibleFieldMappingItem,
  type IncompatibleFieldValueItem,
  type SameFamilyFieldItem,
  type StorageResult,
} from '@kbn/ecs-data-quality-dashboard';
import { useKibana } from '../../../../common/lib/kibana';
import { useFormatBytes } from '../../../../common/components/formatted_bytes';

const DELAY_AFTER_EVERY_CHECK_COMPLETES = 3000; // ms
const GET_INDEX_RESULTS_LATEST_QUERY_KEY = ['index-results-latest'] as const;
const POST_INDEX_RESULTS = '/internal/ecs_data_quality_dashboard/results';
const INTERNAL_API_VERSION = '1';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const formatStorageResult = ({
  batchId,
  indexName,
  pattern,
  isCheckAll,
  partitionedFieldMetadata,
  sizeInBytes,
}: {
  batchId: string;
  indexName: string;
  pattern: string;
  isCheckAll: boolean;
  partitionedFieldMetadata: PartitionedFieldMetadata;
  sizeInBytes: number;
}): StorageResult => {
  const incompatibleFieldMappingItems: IncompatibleFieldMappingItem[] = [];
  const incompatibleFieldValueItems: IncompatibleFieldValueItem[] = [];
  const sameFamilyFieldItems: SameFamilyFieldItem[] = [];

  partitionedFieldMetadata.incompatible.forEach((field) => {
    if (field.type !== field.indexFieldType) {
      incompatibleFieldMappingItems.push({
        fieldName: field.indexFieldName,
        expectedValue: field.type,
        actualValue: field.indexFieldType,
        description: field.description,
      });
    }

    if (field.indexInvalidValues.length > 0) {
      incompatibleFieldValueItems.push({
        fieldName: field.indexFieldName,
        expectedValues: field.allowed_values?.map((x: AllowedValue) => x.name) ?? [],
        actualValues: field.indexInvalidValues.map((v: UnallowedValueCount) => ({
          name: v.fieldName,
          count: v.count,
        })),
        description: field.description,
      });
    }
  });

  partitionedFieldMetadata.sameFamily.forEach((field) => {
    sameFamilyFieldItems.push({
      fieldName: field.indexFieldName,
      expectedValue: field.type,
      actualValue: field.indexFieldType,
      description: field.description,
    });
  });

  return {
    batchId,
    indexName,
    indexPattern: pattern,
    isCheckAll,
    checkedAt: Date.now(),
    docsCount: 0,
    totalFieldCount: partitionedFieldMetadata.all.length,
    ecsFieldCount: partitionedFieldMetadata.ecsCompliant.length,
    customFieldCount: partitionedFieldMetadata.custom.length,
    incompatibleFieldCount: partitionedFieldMetadata.incompatible.length,
    incompatibleFieldMappingItems,
    incompatibleFieldValueItems,
    sameFamilyFieldCount: partitionedFieldMetadata.sameFamily.length,
    sameFamilyFields: partitionedFieldMetadata.sameFamily.map((f) => f.indexFieldName),
    sameFamilyFieldItems,
    unallowedMappingFields: incompatibleFieldMappingItems.map((f) => f.fieldName),
    unallowedValueFields: incompatibleFieldValueItems.map((f) => f.fieldName),
    sizeInBytes,
    ilmPhase: undefined,
    markdownComments: [],
    ecsVersion: EcsVersion,
    indexId: indexName,
    error: null,
  };
};

interface UseAutoCheckIndicesProps {
  indexNames: string[];
  enabled: boolean;
}

export const useAutoCheckIndices = ({ indexNames, enabled }: UseAutoCheckIndicesProps) => {
  const { http } = useKibana().services;
  const formatBytes = useFormatBytes();
  const queryClient = useQueryClient();
  const abortControllerRef = useRef(new AbortController());
  const hasStartedRef = useRef(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState({ checked: 0, total: 0 });
  const [currentIndexName, setCurrentIndexName] = useState<string>('');

  const cancelChecks = useCallback(() => {
    if (!abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort();
      setIsChecking(false);
      setIsComplete(false);
      setProgress({ checked: 0, total: 0 });
      setCurrentIndexName('');
    }
  }, []);

  const startChecks = useCallback(async () => {
    if (indexNames.length === 0 || hasStartedRef.current) {
      return;
    }

    // Deduplicate index names to avoid checking the same index multiple times
    const uniqueIndexNames = [...new Set(indexNames)];

    hasStartedRef.current = true;
    abortControllerRef.current = new AbortController();
    setIsChecking(true);
    setIsComplete(false);
    setProgress({ checked: 0, total: uniqueIndexNames.length });

    const startTime = Date.now();
    const batchId = uuidv4();
    let checked = 0;
    const savePromises: Array<Promise<void>> = [];

    for (let i = 0; i < uniqueIndexNames.length; i++) {
      if (abortControllerRef.current.signal.aborted) {
        break;
      }

      const indexName = uniqueIndexNames[i];
      const isLastCheck = i === uniqueIndexNames.length - 1;

      // Update current index being checked
      setCurrentIndexName(indexName);

      try {
        await checkIndex({
          abortController: abortControllerRef.current,
          batchId,
          checkAllStartTime: startTime,
          formatBytes,
          formatNumber: (value: number | undefined) =>
            value !== undefined ? formatNumber(value) : '-',
          httpFetch: http.fetch,
          indexName,
          isCheckAll: true,
          isLastCheck,
          onCheckCompleted: ({ partitionedFieldMetadata, pattern, error }) => {
            // Save results to backend only if check was successful
            if (partitionedFieldMetadata && !error) {
              const storageResult = formatStorageResult({
                batchId,
                indexName,
                pattern,
                isCheckAll: true,
                partitionedFieldMetadata,
                sizeInBytes: 0,
              });

              // Track the save promise so we can wait for all saves to complete
              const savePromise = http
                .fetch(POST_INDEX_RESULTS, {
                  method: 'POST',
                  version: INTERNAL_API_VERSION,
                  body: JSON.stringify(storageResult),
                })
                .catch(() => {
                  // Silently fail - we don't want to stop the checks
                });

              savePromises.push(savePromise);
            }
          },
          pattern: indexName, // Use index name as pattern for simplicity
        });

        if (!abortControllerRef.current.signal.aborted) {
          checked++;
          setProgress({ checked, total: uniqueIndexNames.length });

          // Add delay between checks (except for the last one)
          if (!isLastCheck) {
            await wait(DELAY_AFTER_EVERY_CHECK_COMPLETES);
          }
        }
      } catch (error) {
        // Continue checking remaining indices even if one fails
        checked++;
        setProgress({ checked, total: uniqueIndexNames.length });
      }
    }

    // Wait for all save operations to complete before invalidating the query
    if (savePromises.length > 0 && !abortControllerRef.current.signal.aborted) {
      await Promise.allSettled(savePromises);
    }

    // Invalidate query to refresh results after all checks complete
    if (!abortControllerRef.current.signal.aborted) {
      queryClient.invalidateQueries(GET_INDEX_RESULTS_LATEST_QUERY_KEY, {
        refetchType: 'active',
      });
    }

    setIsChecking(false);
    setIsComplete(true);
    // Keep progress and currentIndexName visible for complete state
  }, [indexNames, formatBytes, http, queryClient]);

  // Auto-start checks when enabled (only once)
  useEffect(() => {
    if (enabled && indexNames.length > 0 && !hasStartedRef.current) {
      startChecks();
    }
  }, [enabled, indexNames.length, startChecks]);

  // Reset hasStartedRef when indexNames change
  useEffect(() => {
    hasStartedRef.current = false;
  }, [indexNames]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (!abortControllerRef.current.signal.aborted) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isChecking,
    isComplete,
    progress,
    currentIndexName,
    cancelChecks,
    startChecks,
  };
};
