/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import type { ObservabilityOnboardingPluginStartDeps } from '../plugin';
import { createCallApi } from '../services/rest/create_call_api';

export interface IngestFlowDeps {
  core: CoreStart;
  plugins: ObservabilityOnboardingPluginStartDeps;
  isServerless: boolean;
}

export const createIngestFlowComponent = (
  deps: IngestFlowDeps,
  Content: React.ComponentType
): React.FC => {
  createCallApi(deps.core);

  const services = {
    ...deps.core,
    ...deps.plugins,
    context: {
      isServerless: deps.isServerless,
    },
  };

  return () => (
    <KibanaContextProvider services={services}>
      <PerformanceContextProvider>
        <Content />
      </PerformanceContextProvider>
    </KibanaContextProvider>
  );
};
