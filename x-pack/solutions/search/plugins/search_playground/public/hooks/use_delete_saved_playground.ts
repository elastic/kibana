/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';

import { APIRoutes, ROUTE_VERSIONS, SearchPlaygroundMutationKeys } from '../../common';

import { useKibana } from './use_kibana';

export const useDeleteSavedPlayground = () => {
  const { http } = useKibana().services;

  const { mutate: deleteSavedPlayground, ...rest } = useMutation({
    mutationKey: [SearchPlaygroundMutationKeys.DeletePlayground],
    mutationFn: async (playgroundId: string) =>
      http.delete(APIRoutes.DELETE_PLAYGROUND.replace('{id}', playgroundId), {
        version: ROUTE_VERSIONS.v1,
      }),
  });

  return { deleteSavedPlayground, ...rest };
};
