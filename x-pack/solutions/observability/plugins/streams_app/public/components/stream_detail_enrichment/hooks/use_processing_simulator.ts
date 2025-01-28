/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ReadStreamDefinition,
  FieldDefinition,
  getProcessorConfig,
  OrCondition,
  UnaryOperator,
} from '@kbn/streams-schema';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { APIReturnType, StreamsAPIClientRequestParamsOf } from '@kbn/streams-plugin/public/api';
import { useMemo } from 'react';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';
import { ProcessorDefinitionWithUIAttributes } from '../types';
import { processorConverter } from '../utils';

type Simulation = APIReturnType<'POST /api/streams/{id}/processing/_simulate'>;
type SimulationRequestBody =
  StreamsAPIClientRequestParamsOf<'POST /api/streams/{id}/processing/_simulate'>['params']['body'];

export interface UseProcessingSimulatorReturnType {
  error?: IHttpFetchError<ResponseErrorBody>;
  isLoading: boolean;
  refreshSamples: () => void;
  samples: Array<Record<PropertyKey, unknown>>;
  simulation?: Simulation | null;
}

export const useProcessingSimulator = ({
  definition,
  fields,
  processors,
}: {
  definition: ReadStreamDefinition;
  fields: FieldDefinition[];
  processors: ProcessorDefinitionWithUIAttributes[];
}): UseProcessingSimulatorReturnType => {
  const { dependencies } = useKibana();
  const {
    data,
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const {
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

  const draftProcessors = useMemo(
    () => processors.filter((processor) => processor.status === 'draft'),
    [processors]
  );

  const samplingCondition: OrCondition = useMemo(
    () => composeSamplingCondition(draftProcessors),
    [draftProcessors]
  );

  const {
    loading: isLoadingSamples,
    value: samples,
    refresh: refreshSamples,
  } = useStreamsAppFetch(
    ({ signal }) => {
      if (!definition) {
        return { documents: [] };
      }

      return streamsRepositoryClient.fetch('POST /api/streams/{id}/_sample', {
        signal,
        params: {
          path: { id: definition.name },
          body: {
            if: samplingCondition,
            start: start?.valueOf(),
            end: end?.valueOf(),
            size: 100,
          },
        },
      });
    },
    [definition, streamsRepositoryClient, start, end, samplingCondition],
    { disableToastOnError: true }
  );

  const sampleDocs = (samples?.documents ?? []) as Array<Record<PropertyKey, unknown>>;

  const {
    loading: isLoadingSimulation,
    value: simulation,
    error,
  } = useStreamsAppFetch(
    ({ signal }) => {
      if (!definition) {
        return Promise.resolve(null);
      }

      // const detected_fields = detectedFields
      //   ? (detectedFields.filter(
      //       (field) => field.type !== 'unmapped'
      //     ) as SimulationRequestBody['detected_fields'])
      //   : undefined;

      return streamsRepositoryClient.fetch('POST /api/streams/{id}/processing/_simulate', {
        signal,
        params: {
          path: { id: definition.name },
          body: {
            documents: sampleDocs,
            processing: draftProcessors.map(processorConverter.toAPIDefinition),
            // detected_fields,
          },
        },
      });
    },
    [definition, sampleDocs, draftProcessors],
    { disableToastOnError: true }
  );

  return {
    isLoading: isLoadingSamples || isLoadingSimulation,
    error: error as IHttpFetchError<ResponseErrorBody> | undefined,
    refreshSamples,
    simulation,
    samples: sampleDocs,
  };
};

const composeSamplingCondition = (processors: ProcessorDefinitionWithUIAttributes[]) => {
  const uniqueFields = [
    ...new Set(processors.map((processor) => getProcessorConfig(processor).field)),
  ];

  const conditions = uniqueFields.map((field) => ({
    field,
    operator: 'exists' as UnaryOperator,
  }));

  return { or: conditions };
};
