/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProjectRouting } from '@kbn/es-query';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useState } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import type { JobType } from '../../../../common/http_api/latest';
import type { DatasetFilter } from '../../../../common/log_analysis';
import {
  combineDatasetFilters,
  filterDatasetFilter,
  isExampleDataIndex,
} from '../../../../common/log_analysis';
import type {
  AvailableIndex,
  ValidationIndicesError,
  ValidationUIError,
} from '../../../components/logging/log_analysis_setup/initial_configuration_step';
import { useIsInfraMlCpsEnabled } from '../../../hooks/use_infra_ml_cps';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useTrackedPromise } from '../../../hooks/use_tracked_promise';
import type { ModuleDescriptor, ModuleSourceConfiguration } from './log_analysis_module_types';

type SetupHandler = (
  indices: string[],
  startTime: number | undefined,
  endTime: number | undefined,
  datasetFilter: DatasetFilter,
  projectRouting?: ProjectRouting
) => void;

interface AnalysisSetupStateArguments<T extends JobType> {
  cleanUpAndSetUpModule: SetupHandler;
  moduleDescriptor: ModuleDescriptor<T>;
  setUpModule: SetupHandler;
  sourceConfiguration: ModuleSourceConfiguration;
}

const fourWeeksInMs = 86400000 * 7 * 4;

export const useAnalysisSetupState = <T extends JobType>({
  cleanUpAndSetUpModule,
  moduleDescriptor: { validateSetupDatasets, validateSetupIndices },
  setUpModule,
  sourceConfiguration,
}: AnalysisSetupStateArguments<T>) => {
  const { services } = useKibanaContextForPlugin();
  const [startTime, setStartTime] = useState<number | undefined>(Date.now() - fourWeeksInMs);
  const [endTime, setEndTime] = useState<number | undefined>(undefined);

  const isCpsEnabled = useIsInfraMlCpsEnabled();
  const [projectRouting, setProjectRouting] = useState<ProjectRouting>(undefined);
  const [isCpsManagerReady, setIsCpsManagerReady] = useState(false);

  useEffect(() => {
    if (!isCpsEnabled) return;
    let cancelled = false;
    // cpsManager.whenReady() never rejects. Even if something goes wrong, it will resolve with a standard value. A catch block isn't required
    services.cps?.cpsManager?.whenReady().then(() => {
      if (!cancelled) {
        setProjectRouting(services.cps?.cpsManager?.getDefaultProjectRouting());
        setIsCpsManagerReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isCpsEnabled, services.cps]);

  const isTimeRangeValid = useMemo(
    () => (startTime != null && endTime != null ? startTime < endTime : true),
    [endTime, startTime]
  );

  const [validatedIndices, setValidatedIndices] = useState<AvailableIndex[]>(
    sourceConfiguration.indices.map((indexName) => ({
      name: indexName,
      validity: 'unknown' as const,
    }))
  );

  const updateIndicesWithValidationErrors = useCallback(
    (validationErrors: ValidationIndicesError[]) =>
      setValidatedIndices((availableIndices) =>
        availableIndices.map((previousAvailableIndex) => {
          const indexValiationErrors = validationErrors.filter(
            ({ index }) => index === previousAvailableIndex.name
          );

          if (indexValiationErrors.length > 0) {
            return {
              validity: 'invalid',
              name: previousAvailableIndex.name,
              errors: indexValiationErrors,
            };
          } else if (previousAvailableIndex.validity === 'valid') {
            return {
              ...previousAvailableIndex,
              validity: 'valid',
              errors: [],
            };
          } else {
            return {
              validity: 'valid',
              name: previousAvailableIndex.name,
              isSelected: !isExampleDataIndex(previousAvailableIndex.name),
              availableDatasets: [],
              datasetFilter: {
                type: 'includeAll' as const,
              },
            };
          }
        })
      ),
    []
  );

  const updateIndicesWithAvailableDatasets = useCallback(
    (availableDatasets: Array<{ indexName: string; datasets: string[] }>) =>
      setValidatedIndices((availableIndices) =>
        availableIndices.map((previousAvailableIndex) => {
          if (previousAvailableIndex.validity !== 'valid') {
            return previousAvailableIndex;
          }

          const availableDatasetsForIndex = availableDatasets.filter(
            ({ indexName }) => indexName === previousAvailableIndex.name
          );
          const newAvailableDatasets = availableDatasetsForIndex.flatMap(
            ({ datasets }) => datasets
          );

          // filter out datasets that have disappeared if this index' datasets were updated
          const newDatasetFilter: DatasetFilter =
            availableDatasetsForIndex.length > 0
              ? filterDatasetFilter(previousAvailableIndex.datasetFilter, (dataset) =>
                  newAvailableDatasets.includes(dataset)
                )
              : previousAvailableIndex.datasetFilter;

          return {
            ...previousAvailableIndex,
            availableDatasets: newAvailableDatasets,
            datasetFilter: newDatasetFilter,
          };
        })
      ),
    []
  );

  const validIndexNames = useMemo(
    () => validatedIndices.filter((index) => index.validity === 'valid').map((index) => index.name),
    [validatedIndices]
  );

  const selectedIndexNames = useMemo(
    () =>
      validatedIndices
        .filter((index) => index.validity === 'valid' && index.isSelected)
        .map((i) => i.name),
    [validatedIndices]
  );

  const datasetFilter = useMemo(
    () =>
      validatedIndices
        .flatMap((validatedIndex) =>
          validatedIndex.validity === 'valid'
            ? validatedIndex.datasetFilter
            : { type: 'includeAll' as const }
        )
        .reduce(combineDatasetFilters, { type: 'includeAll' as const }),
    [validatedIndices]
  );

  const [validateIndicesRequest, validateIndices] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await validateSetupIndices(
          sourceConfiguration.indices,
          sourceConfiguration.timestampField,
          sourceConfiguration.runtimeMappings,
          services.http.fetch,
          projectRouting
        );
      },
      onResolve: ({ data: { errors } }) => {
        updateIndicesWithValidationErrors(errors);
      },
      onReject: () => {
        setValidatedIndices([]);
      },
    },
    [sourceConfiguration.indices, sourceConfiguration.timestampField, projectRouting]
  );

  const [validateDatasetsRequest, validateDatasets] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        if (validIndexNames.length === 0) {
          return { data: { datasets: [] } };
        }

        return await validateSetupDatasets(
          validIndexNames,
          sourceConfiguration.timestampField,
          startTime ?? 0,
          endTime ?? Date.now(),
          sourceConfiguration.runtimeMappings,
          services.http.fetch,
          projectRouting
        );
      },
      onResolve: ({ data: { datasets } }) => {
        updateIndicesWithAvailableDatasets(datasets);
      },
    },
    [validIndexNames, sourceConfiguration.timestampField, startTime, endTime, projectRouting]
  );

  const setUp = useCallback(() => {
    return setUpModule(selectedIndexNames, startTime, endTime, datasetFilter, projectRouting);
  }, [setUpModule, selectedIndexNames, startTime, endTime, datasetFilter, projectRouting]);

  const cleanUpAndSetUp = useCallback(() => {
    return cleanUpAndSetUpModule(
      selectedIndexNames,
      startTime,
      endTime,
      datasetFilter,
      projectRouting
    );
  }, [
    cleanUpAndSetUpModule,
    selectedIndexNames,
    startTime,
    endTime,
    datasetFilter,
    projectRouting,
  ]);

  // Treating the CPS manager warm-up as "validating" both disables submission and
  // suppresses the transient MISSING_PROJECT_ROUTING error until the default project
  // routing has been seeded.
  const isValidating = useMemo(
    () =>
      validateIndicesRequest.state === 'pending' ||
      validateDatasetsRequest.state === 'pending' ||
      (isCpsEnabled && !isCpsManagerReady),
    [validateDatasetsRequest.state, validateIndicesRequest.state, isCpsManagerReady, isCpsEnabled]
  );

  const validationErrors = useMemo<ValidationUIError[]>(() => {
    if (isValidating) {
      return [];
    }

    return [
      // validate request status
      ...(validateIndicesRequest.state === 'rejected' ||
      validateDatasetsRequest.state === 'rejected'
        ? [{ error: 'NETWORK_ERROR' as const }]
        : []),
      // validation request results
      ...validatedIndices.reduce<ValidationUIError[]>((errors, index) => {
        return index.validity === 'invalid' && selectedIndexNames.includes(index.name)
          ? [...errors, ...index.errors]
          : errors;
      }, []),
      // index count
      ...(selectedIndexNames.length === 0 ? [{ error: 'TOO_FEW_SELECTED_INDICES' as const }] : []),
      // time range
      ...(!isTimeRangeValid ? [{ error: 'INVALID_TIME_RANGE' as const }] : []),
      // project scope must be explicit when CPS is available
      ...(isCpsEnabled && projectRouting === undefined
        ? [{ error: 'MISSING_PROJECT_ROUTING' as const }]
        : []),
    ];
  }, [
    isValidating,
    validateIndicesRequest.state,
    validateDatasetsRequest.state,
    validatedIndices,
    selectedIndexNames,
    isTimeRangeValid,
    isCpsEnabled,
    projectRouting,
  ]);

  const prevStartTime = usePrevious(startTime);
  const prevEndTime = usePrevious(endTime);
  const prevValidIndexNames = usePrevious(validIndexNames);
  const prevProjectRouting = usePrevious(projectRouting);

  // Hold off validation until the CPS manager has seeded the default project routing,
  // so the first request already carries the correct scope instead of being clamped to
  // the origin project and immediately refetched.
  const isAwaitingProjectRouting = isCpsEnabled && !isCpsManagerReady;

  useEffect(() => {
    if (!isTimeRangeValid || isAwaitingProjectRouting) {
      return;
    }

    validateIndices();
  }, [isTimeRangeValid, isAwaitingProjectRouting, validateIndices]);

  useEffect(() => {
    if (!isTimeRangeValid || isAwaitingProjectRouting) {
      return;
    }

    if (
      startTime !== prevStartTime ||
      endTime !== prevEndTime ||
      projectRouting !== prevProjectRouting ||
      !isEqual(validIndexNames, prevValidIndexNames)
    ) {
      validateDatasets();
    }
  }, [
    endTime,
    isAwaitingProjectRouting,
    isTimeRangeValid,
    prevEndTime,
    prevProjectRouting,
    prevStartTime,
    prevValidIndexNames,
    projectRouting,
    startTime,
    validIndexNames,
    validateDatasets,
  ]);

  return {
    cleanUpAndSetUp,
    datasetFilter,
    endTime,
    isCpsEnabled,
    isCpsManagerReady,
    isValidating,
    projectRouting,
    selectedIndexNames,
    setEndTime,
    setProjectRouting,
    setStartTime,
    setUp,
    startTime,
    validatedIndices,
    setValidatedIndices,
    validationErrors,
  };
};
