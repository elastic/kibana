/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';

import type { PlaygroundSavedObject } from '../../common';
import { APIRoutes, ROUTE_VERSIONS, SearchPlaygroundMutationKeys } from '../../common';

import { useKibana } from './use_kibana';
import type { PlaygroundResponse } from '../types';

export const useSavePlayground = () => {
  const { http } = useKibana().services;

  const { mutate: savePlayground, ...rest } = useMutation({
    mutationKey: [SearchPlaygroundMutationKeys.SavePlayground],
    mutationFn: async (playground: PlaygroundSavedObject) =>
      http.put<PlaygroundResponse>(APIRoutes.PUT_PLAYGROUND_CREATE, {
        body: JSON.stringify(playground),
        version: ROUTE_VERSIONS.v1,
      }),
  });

  return { savePlayground, ...rest };
};
