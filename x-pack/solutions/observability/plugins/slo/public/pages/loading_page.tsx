/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { usePluginContext } from '../hooks/use_plugin_context';
import { LoadingState } from '../components/loading_state';

export function LoadingPage({ dataTestSubj }: { dataTestSubj?: string }) {
  const { ObservabilityPageTemplate } = usePluginContext();
  return (
    <ObservabilityPageTemplate data-test-subj={dataTestSubj}>
      <LoadingState dataTestSubj={dataTestSubj} />
    </ObservabilityPageTemplate>
  );
}
