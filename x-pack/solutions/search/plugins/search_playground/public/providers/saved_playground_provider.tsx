/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import type { HttpSetup } from '@kbn/core-http-browser';
import { FormProvider as ReactHookFormProvider, UseFormReturn, useForm } from 'react-hook-form';

import { ROUTE_VERSIONS } from '../../common';
import { useKibana } from '../hooks/use_kibana';
import { useLoadFieldsByIndices } from '../hooks/use_load_fields_by_indices';

import { LLMS_QUERY_KEY, LLMsQuery } from '../hooks/use_llms_models';
import {
  APIRoutes,
  SavedPlaygroundForm,
  PlaygroundResponse,
  PlaygroundForm,
  LLMModel,
} from '../types';
import { savedPlaygroundFormResolver } from '../utils/playground_form_resolver';
import { fetchSavedPlaygroundError, parseSavedPlayground } from '../utils/saved_playgrounds';

export interface SavedPlaygroundFormProviderProps {
  playgroundId: string;
}

interface FetchSavedPlaygroundOptions {
  client: QueryClient;
  http: HttpSetup;
}

const fetchSavedPlayground =
  (playgroundId: string, { http, client }: FetchSavedPlaygroundOptions) =>
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
    let models: LLMModel[];
    try {
      models = await client.fetchQuery(LLMS_QUERY_KEY, LLMsQuery(http, client));
    } catch (e) {
      models = [];
    }

    const result = parseSavedPlayground(playgroundResp, models);
    return result;
  };

export const SavedPlaygroundFormProvider = ({
  children,
  playgroundId,
}: React.PropsWithChildren<SavedPlaygroundFormProviderProps>) => {
  const client = useQueryClient();
  const { http } = useKibana().services;
  const form = useForm<SavedPlaygroundForm>({
    defaultValues: fetchSavedPlayground(playgroundId, { http, client }),
    resolver: savedPlaygroundFormResolver,
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
  return <ReactHookFormProvider {...form}>{children}</ReactHookFormProvider>;
};
