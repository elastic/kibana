/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';

import {
  APIRoutes,
  ROUTE_VERSIONS,
  SearchPlaygroundMutationKeys,
  PlaygroundSavedObject,
} from '../../common';

import { useKibana } from './use_kibana';

export const useUpdateSavedPlayground = () => {
  const { http } = useKibana().services;

  const { mutate: updateSavedPlayground, ...rest } = useMutation({
    mutationKey: [SearchPlaygroundMutationKeys.UpdatePlayground],
    mutationFn: async ({
      playgroundId,
      playground,
    }: {
      playgroundId: string;
      playground: PlaygroundSavedObject;
    }) =>
      http.put(APIRoutes.PUT_PLAYGROUND_UPDATE.replace('{id}', playgroundId), {
        body: JSON.stringify(playground),
        version: ROUTE_VERSIONS.v1,
      }),
  });

  return { updateSavedPlayground, ...rest };
};
