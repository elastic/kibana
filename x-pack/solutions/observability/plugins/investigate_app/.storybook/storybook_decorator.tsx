/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType, useMemo } from 'react';
import { InvestigateAppContextProvider } from '../public/components/investigate_app_context_provider';
import { getMockInvestigateAppContext } from './get_mock_investigate_app_services';

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  const context = useMemo(() => getMockInvestigateAppContext(), []);
  return (
    <InvestigateAppContextProvider context={context}>
      <Story />
    </InvestigateAppContextProvider>
  );
}
