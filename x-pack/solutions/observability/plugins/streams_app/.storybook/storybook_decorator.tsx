/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ComponentType, useMemo } from 'react';
import { StreamsAppContextProvider } from '../public/components/streams_app_context_provider';
import { getMockStreamsAppContext } from './get_mock_streams_app_context';

export function KibanaReactStorybookDecorator(Story: ComponentType) {
  const context = useMemo(() => getMockStreamsAppContext(), []);
  return (
    <StreamsAppContextProvider context={context}>
      <Story />
    </StreamsAppContextProvider>
  );
}
