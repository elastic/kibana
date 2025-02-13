/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { useKibana } from './use_kibana';

export const useSynonymsSetExists = (
  onSuccess: (exists: boolean) => void,
  onError?: () => void
) => {
  const {
    services: { http },
  } = useKibana();

  return useMutation(
    async ({ synonymsSetId }: { synonymsSetId: string }) => {
      return await http.get<boolean>(`/internal/search_synonyms/synonyms/${synonymsSetId}/exists`);
    },
    {
      onSuccess: (exists) => {
        onSuccess(exists);
      },
      onError: () => {
        if (onError) {
          onError();
        }
      },
    }
  );
};
