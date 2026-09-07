/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { createSdlcApiClient, type SdlcApiClient } from '../services/sdlc_api_client';

const SdlcApiContext = createContext<SdlcApiClient | undefined>(undefined);

export const SdlcApiProvider = ({
  http,
  children,
}: {
  http: HttpSetup;
  children: React.ReactNode;
}) => {
  const client = useMemo(() => createSdlcApiClient(http), [http]);

  return <SdlcApiContext.Provider value={client}>{children}</SdlcApiContext.Provider>;
};

export const useSdlcApi = (): SdlcApiClient => {
  const client = useContext(SdlcApiContext);
  if (!client) {
    throw new Error('useSdlcApi must be used within SdlcApiProvider');
  }
  return client;
};
