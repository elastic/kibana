/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetchSloDefinitionsWithRemote } from './use_fetch_slo_definitions_with_remote';

export interface UseHasSlosResponse {
  hasSlos: boolean;
  isLoading: boolean;
  isError: boolean;
}

export const useHasSlos = (): UseHasSlosResponse => {
  const { data, isLoading, isError } = useFetchSloDefinitionsWithRemote({ size: 1 });
  const hasSlos = !!data?.results?.length;
  return { hasSlos, isLoading, isError };
};
