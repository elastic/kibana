/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';

const queryClient = new QueryClient({});

export interface InferenceEndpointsProviderProps {
  children: React.ReactNode;
}

export const InferenceEndpointsProvider: FC<PropsWithChildren<InferenceEndpointsProviderProps>> = ({
  children,
}) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
