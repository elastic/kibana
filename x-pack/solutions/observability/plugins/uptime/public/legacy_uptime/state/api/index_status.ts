/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS } from '../../../../common/constants';
import type { StatesIndexStatus } from '../../../../common/runtime_types';
import { StatesIndexStatusType } from '../../../../common/runtime_types';
import { apiService } from './utils';

const indexStatusPromises = new Map<string, Promise<StatesIndexStatus>>();

export const fetchIndexStatus = async (from?: string, to?: string): Promise<StatesIndexStatus> => {
  const rangeKey = `${from ?? ''}|${to ?? ''}`;
  const inFlight = indexStatusPromises.get(rangeKey);
  if (inFlight) {
    return inFlight;
  }

  const indexStatusPromise: Promise<StatesIndexStatus> = apiService.get(
    API_URLS.INDEX_STATUS,
    { from, to },
    StatesIndexStatusType
  );
  indexStatusPromises.set(rangeKey, indexStatusPromise);

  const clear = () => {
    indexStatusPromises.delete(rangeKey);
  };
  indexStatusPromise.then(clear, clear);

  return indexStatusPromise;
};
