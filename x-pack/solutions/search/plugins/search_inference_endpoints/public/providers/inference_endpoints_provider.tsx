/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { FC, PropsWithChildren } from 'react';

const queryClient = new QueryClient({});

export interface InferenceEndpointsProviderProps {
  children: React.ReactNode;
}

export const InferenceEndpointsProvider: FC<PropsWithChildren<InferenceEndpointsProviderProps>> = ({
  children,
}) => {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
