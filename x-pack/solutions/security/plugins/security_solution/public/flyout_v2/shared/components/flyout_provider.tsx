/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import type { StartServices } from '../../../types';
import { ReactQueryClientProvider } from '../../../common/containers/query_client/query_client_provider';
import { KibanaContextProvider } from '../../../common/lib/kibana';

export const flyoutProviders = ({
  services,
  children,
}: {
  services: StartServices;
  children: ReactNode;
}): ReactElement => {
  return (
    <KibanaContextProvider services={services}>
      <ReactQueryClientProvider>{children}</ReactQueryClientProvider>
    </KibanaContextProvider>
  );
};
