/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppToasts } from './use_app_toasts';
import { loadAiConnectors } from '../utils/connectors/ai_connectors';
import * as i18n from './translations';
import { useKibana } from '../lib/kibana';

const QUERY_KEY = ['ai_connectors'];

export const useAIConnectors = () => {
  const {
    services: { http, settings },
  } = useKibana();

  const { addError } = useAppToasts();

  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => loadAiConnectors({ http, settings }),
    onError: (err) => {
      addError(err, {
        title: i18n.ERROR_FETCH_AI_CONNECTORS,
      });
    },
    refetchOnWindowFocus: false,
  });

  return useMemo(
    () => ({
      aiConnectors: data ?? [],
      isLoading,
      error,
    }),
    [data, isLoading, error]
  );
};
