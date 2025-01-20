/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { App } from './components/app';
import { useInferenceEndpointsBreadcrumbs } from './hooks/use_inference_endpoints_breadcrumbs';
import { useKibana } from './hooks/use_kibana';
import { InferenceEndpointsProvider } from './providers/inference_endpoints_provider';

export const InferenceEndpointsOverview: React.FC = () => {
  const {
    services: { console: consolePlugin, history, searchNavigation },
  } = useKibana();
  useInferenceEndpointsBreadcrumbs();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <InferenceEndpointsProvider>
      <KibanaPageTemplate
        offset={0}
        restrictWidth={false}
        grow={false}
        data-test-subj="inferenceEndpointsPage"
        solutionNav={searchNavigation?.useClassicNavigation(history)}
      >
        <App />
        {embeddableConsole}
      </KibanaPageTemplate>
    </InferenceEndpointsProvider>
  );
};
