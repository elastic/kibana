/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import type { HttpSetup } from '@kbn/core-http-browser';
import { FormProvider as ReactHookFormProvider, UseFormReturn, useForm } from 'react-hook-form';

import { ROUTE_VERSIONS, SearchPlaygroundQueryKeys } from '../../common';
import { useKibana } from '../hooks/use_kibana';
import { useLoadFieldsByIndices } from '../hooks/use_load_fields_by_indices';

import { LLMsQuery } from '../hooks/use_llms_models';
import {
  APIRoutes,
  SavedPlaygroundForm,
  PlaygroundResponse,
  PlaygroundForm,
  LLMModel,
  SavedPlaygroundLoadErrors,
} from '../types';
import { savedPlaygroundFormResolver } from '../utils/playground_form_resolver';
import { fetchSavedPlaygroundError, parseSavedPlayground } from '../utils/saved_playgrounds';
import { SavedPlaygroundInvalidStateModal } from '../components/saved_playground/invalid_state_modal';
import { IndicesQuery } from '../hooks/use_query_indices';

export interface SavedPlaygroundFormProviderProps {
  playgroundId: string;
}

interface FetchSavedPlaygroundOptions {
  client: QueryClient;
  http: HttpSetup;
  setLoadErrors: (errors: SavedPlaygroundLoadErrors | null) => void;
}

const fetchSavedPlayground =
  (playgroundId: string, { http, client, setLoadErrors }: FetchSavedPlaygroundOptions) =>
  async (): Promise<SavedPlaygroundForm> => {
    let playgroundResp: PlaygroundResponse;
    try {
      playgroundResp = await http.get<PlaygroundResponse>(
        APIRoutes.GET_PLAYGROUND.replace('{id}', playgroundId),
        {
          version: ROUTE_VERSIONS.v1,
        }
      );
    } catch (e) {
      return fetchSavedPlaygroundError(e);
    }
    let models: LLMModel[] = [];
    let indices: string[] = [];
    const indicesQuery = playgroundResp.data.indices.join(',');
    [models, indices] = await Promise.all([
      client
        .fetchQuery([SearchPlaygroundQueryKeys.LLMsQuery], LLMsQuery(http, client))
        .catch(() => []),
      client
        .fetchQuery(
          [SearchPlaygroundQueryKeys.QueryIndices, indicesQuery],
          IndicesQuery(http, indicesQuery, true)
        )
        .catch(() => []),
    ]);
    // validate indices
    const validIndices: string[] = [];
    const missingIndices: string[] = [];
    let missingModel: string | undefined;
    for (const index of playgroundResp.data.indices) {
      if (indices.includes(index)) {
        validIndices.push(index);
      } else {
        missingIndices.push(index);
      }
    }
    playgroundResp.data.indices = validIndices;
    const summarizationModel = playgroundResp.data.summarizationModel;
    if (summarizationModel && summarizationModel.modelId) {
      const model = models.find(
        (llm) =>
          llm.connectorId === summarizationModel.connectorId &&
          llm.value === summarizationModel.modelId
      );
      if (model === undefined) {
        missingModel = summarizationModel.modelId;
      }
    } else if (summarizationModel) {
      const model = models.find((llm) => llm.connectorId === summarizationModel.connectorId);
      if (model === undefined) {
        missingModel = summarizationModel.connectorId;
      }
    }
    if (missingModel || missingIndices.length > 0) {
      setLoadErrors({
        missingIndices,
        missingModel,
      });
    }

    const result = parseSavedPlayground(playgroundResp, models);
    return result;
  };

export const SavedPlaygroundFormProvider = ({
  children,
  playgroundId,
}: React.PropsWithChildren<SavedPlaygroundFormProviderProps>) => {
  const [loadErrors, setLoadErrors] = useState<SavedPlaygroundLoadErrors | null>(null);
  const client = useQueryClient();
  const { http } = useKibana().services;
  const form = useForm<SavedPlaygroundForm>({
    defaultValues: fetchSavedPlayground(playgroundId, { http, client, setLoadErrors }),
    resolver: savedPlaygroundFormResolver,
    mode: 'onChange',
    reValidateMode: 'onChange',
    context: { http },
  });
  useLoadFieldsByIndices({
    watch: form.watch,
    setValue: form.setValue,
    getValues: form.getValues,
    // casting form handlers here because TS isn't happy with UseFormReturn<SavedPlaygroundForm> even though SavedPlaygroundForm extends PlaygroundForm
  } as unknown as Pick<UseFormReturn<PlaygroundForm>, 'watch' | 'getValues' | 'setValue'>);
  useEffect(() => {
    if (form.formState.isLoading) return;
    // Trigger validation of existing values after initial loading.
    form.trigger();
  }, [form, form.formState.isLoading]);
  return (
    <ReactHookFormProvider {...form}>
      <>
        {children}
        {loadErrors !== null && (
          <SavedPlaygroundInvalidStateModal
            errors={loadErrors}
            onClose={() => setLoadErrors(null)}
          />
        )}
      </>
    </ReactHookFormProvider>
  );
};
