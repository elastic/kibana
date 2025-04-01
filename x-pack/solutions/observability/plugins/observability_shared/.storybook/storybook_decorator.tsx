/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, useMemo } from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { getMockContext, ObservabilitySharedKibanaContext } from './get_mock_context';

export function ObservabilitySharedContextProvider({
  context,
  children,
}: {
  context: ObservabilitySharedKibanaContext;
  children: React.ReactNode;
}) {
  return <KibanaContextProvider services={context}>{children}</KibanaContextProvider>;
}

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  const context = useMemo(() => getMockContext(), []);
  return (
    <ObservabilitySharedContextProvider context={context}>
      <Story />
    </ObservabilitySharedContextProvider>
  );
}
