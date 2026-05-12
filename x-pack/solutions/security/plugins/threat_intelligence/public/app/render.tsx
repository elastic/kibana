/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';

import { IntelligenceHubApp } from './intelligence_hub_app';

interface RenderAppArgs {
  core: CoreStart;
  params: AppMountParameters;
}

export const renderApp = ({ core, params }: RenderAppArgs): (() => void) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <IntelligenceHubApp core={core} />
    </KibanaRenderContextProvider>,
    params.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};
