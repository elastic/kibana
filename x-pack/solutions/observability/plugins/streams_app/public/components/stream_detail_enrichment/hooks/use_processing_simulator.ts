/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import { useAbortController } from '@kbn/observability-utils-browser/hooks/use_abort_controller';
import {
  DissectProcessorDefinition,
  ReadStreamDefinition,
  Condition,
  ProcessorDefinition,
  GrokProcessorDefinition,
} from '@kbn/streams-schema';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { useDateRange } from '@kbn/observability-utils-browser/hooks/use_date_range';
import { APIReturnType, StreamsAPIClientRequestParamsOf } from '@kbn/streams-plugin/public/api';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { useKibana } from '../../../hooks/use_kibana';
import { ProcessingDefinition } from '../types';
import { DetectedField } from '../types';
import { emptyEqualsToAlways } from '../../../util/condition';

type Simulation = APIReturnType<'POST /api/streams/{id}/processing/_simulate'>;
type SimulationRequestBody =
  StreamsAPIClientRequestParamsOf<'POST /api/streams/{id}/processing/_simulate'>['params']['body'];

export interface UseProcessingSimulatorReturnType {
  error?: IHttpFetchError<ResponseErrorBody>;
  isLoading: boolean;
  refreshSamples: () => void;
  samples: Array<Record<PropertyKey, unknown>>;
  simulate: (
    processing: ProcessingDefinition,
    detectedFields?: DetectedField[]
  ) => Promise<Simulation | null>;
  simulation?: Simulation | null;
}

export const useProcessingSimulator = ({
  definition,
  condition,
}: {
  definition: ReadStreamDefinition;
  condition?: Condition;
}): UseProcessingSimulatorReturnType => {
  const { dependencies } = useKibana();
  const {
    data,
    streams: { streamsRepositoryClient },
  } = dependencies.start;

  const {
    absoluteTimeRange: { start, end },
  } = useDateRange({ data });

  const abortController = useAbortController();

  const serializedCondition = JSON.stringify(condition);

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
            if: condition ? emptyEqualsToAlways(condition) : { always: {} },
            start: start?.valueOf(),
            end: end?.valueOf(),
            size: 100,
          },
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [definition, streamsRepositoryClient, start, end, serializedCondition],
    { disableToastOnError: true }
  );

  const sampleDocs = (samples?.documents ?? []) as Array<Record<PropertyKey, unknown>>;

  const [{ loading: isLoadingSimulation, error, value }, simulate] = useAsyncFn(
    (processingDefinition: ProcessingDefinition, detectedFields?: DetectedField[]) => {
      if (!definition) {
        return Promise.resolve(null);
      }

      const processorDefinition: ProcessorDefinition =
        'grok' in processingDefinition.config
          ? ({
              grok: {
                field: processingDefinition.config.grok.field,
                ignore_failure: processingDefinition.config.grok.ignore_failure,
                ignore_missing: processingDefinition.config.grok.ignore_missing,
                if: emptyEqualsToAlways(processingDefinition.condition),
                patterns: processingDefinition.config.grok.patterns,
                pattern_definitions: processingDefinition.config.grok.pattern_definitions,
              },
            } satisfies GrokProcessorDefinition)
          : ({
              dissect: {
                field: processingDefinition.config.dissect.field,
                ignore_failure: processingDefinition.config.dissect.ignore_failure,
                ignore_missing: processingDefinition.config.dissect.ignore_missing,
                if: emptyEqualsToAlways(processingDefinition.condition),
                pattern: processingDefinition.config.dissect.pattern,
                append_separator: processingDefinition.config.dissect.append_separator,
              },
            } satisfies DissectProcessorDefinition);

      const detected_fields = detectedFields
        ? (detectedFields.filter(
            (field) => field.type !== 'unmapped'
          ) as SimulationRequestBody['detected_fields'])
        : undefined;

      return streamsRepositoryClient.fetch('POST /api/streams/{id}/processing/_simulate', {
        signal: abortController.signal,
        params: {
          path: { id: definition.name },
          body: {
            documents: sampleDocs,
            processing: [processorDefinition],
            detected_fields,
          },
        },
      });
    },
    [definition, sampleDocs]
  );

  return {
    isLoading: isLoadingSamples || isLoadingSimulation,
    error: error as IHttpFetchError<ResponseErrorBody> | undefined,
    refreshSamples,
    simulate,
    simulation: value,
    samples: sampleDocs,
  };
};
