/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { type QueryClient, useQueryClient } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider as ReactHookFormProvider, useForm } from 'react-hook-form';

import { ROUTE_VERSIONS, SearchPlaygroundQueryKeys } from '../../common';
import { useKibana } from '../hooks/use_kibana';
import { useLoadFieldsByIndices } from '../hooks/use_load_fields_by_indices';

import { LLMsQuery } from '../hooks/use_llms_models';
import type {
  SavedPlaygroundForm,
  PlaygroundResponse,
  PlaygroundForm,
  LLMModel,
  SavedPlaygroundLoadErrors,
} from '../types';
import { APIRoutes } from '../types';
import { savedPlaygroundFormResolver } from '../utils/playground_form_resolver';
import {
  fetchSavedPlaygroundError,
  parseSavedPlayground,
  validateSavedPlaygroundIndices,
  validateSavedPlaygroundModel,
} from '../utils/saved_playgrounds';
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

const fetchDataForValidation = async (
  selectedIndices: string[],
  { client, http }: FetchSavedPlaygroundOptions
) => {
  let models: LLMModel[] = [];
  let indices: string[] = [];
  const indicesQuery = selectedIndices.join(',');
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
  return { models, indices };
};

const fetchSavedPlayground =
  (playgroundId: string, options: FetchSavedPlaygroundOptions) =>
  async (): Promise<SavedPlaygroundForm> => {
    const { http, setLoadErrors } = options;
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
    const { models, indices } = await fetchDataForValidation(playgroundResp.data.indices, options);
    const { validIndices, missingIndices } = validateSavedPlaygroundIndices(
      playgroundResp.data.indices,
      indices
    );
    const missingModel = validateSavedPlaygroundModel(
      playgroundResp.data.summarizationModel,
      models
    );
    playgroundResp.data.indices = validIndices;
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
