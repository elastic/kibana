/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createReactQueryWrapper(): React.FC<React.PropsWithChildren<{}>> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Turn retries off, otherwise we won't be able to test errors
        retry: false,
      },
    },
  });

  // eslint-disable-next-line react/display-name
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
