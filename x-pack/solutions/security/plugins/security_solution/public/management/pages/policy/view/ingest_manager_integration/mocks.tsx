/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import type { RenderOptions } from '@testing-library/react';
// eslint-disable-next-line import/no-extraneous-dependencies
import { render as reactRender } from '@testing-library/react';
import type { PackageInfo } from '@kbn/fleet-plugin/common/types';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { deepFreeze } from '@kbn/std';
import { createFleetContextReduxStore } from '../../../../../common/components/with_security_context/store';
import type { AppContextTestRender, UiRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import { managementReducer } from '../../../../store/reducer';
import { RenderContextProviders } from '../../../../../common/components/with_security_context/render_context_providers';
import { SECURITY_FEATURE_ID } from '../../../../../../common/constants';

export const createFleetContextRendererMock = (): AppContextTestRender => {
  const mockedContext = createAppRootMockRenderer();
  const { coreStart, depsStart, queryClient, startServices } = mockedContext;
  const store = createFleetContextReduxStore({
    coreStart,
    depsStart,
    reducersObject: {
      management: managementReducer,
    },
    preloadedState: {
      // @ts-expect-error TS2322
      management: undefined,
    },
    additionalMiddleware: [mockedContext.middlewareSpy.actionSpyMiddleware],
  });

  const Wrapper: RenderOptions['wrapper'] = ({ children }: PropsWithChildren<unknown>) => {
    startServices.application.capabilities = deepFreeze({
      ...startServices.application.capabilities,
      [SECURITY_FEATURE_ID]: { show: true, crud: true },
    });

    return (
      <EuiThemeProvider>
        <KibanaRenderContextProvider {...coreStart}>
          <KibanaContextProvider services={startServices}>
            <RenderContextProviders
              store={store}
              depsStart={depsStart}
              queryClient={queryClient}
              upsellingService={startServices.upselling}
            >
              {children}
            </RenderContextProviders>
          </KibanaContextProvider>
        </KibanaRenderContextProvider>
      </EuiThemeProvider>
    );
  };

  const render: UiRender = (ui, options) => {
    return reactRender(ui, {
      wrapper: Wrapper,
      ...options,
    });
  };

  return {
    ...mockedContext,
    store,
    render,
  };
};

export const generateFleetPackageInfo = (): PackageInfo => {
  // Copied from: x-pack/plugins/fleet/common/services/package_to_package_policy.test.ts
  const mockPackage: PackageInfo = {
    name: 'endpoint',
    title: 'Endpoint mock package',
    version: '0.0.0',
    latestVersion: '0.0.0',
    description: 'description',
    type: 'integration',
    categories: [],
    conditions: { kibana: { version: '' } },
    format_version: '',
    download: '',
    path: '',
    assets: {
      kibana: {
        alerting_rule_template: [],
        slo_template: [],
        csp_rule_template: [],
        dashboard: [],
        visualization: [],
        search: [],
        index_pattern: [],
        map: [],
        lens: [],
        ml_module: [],
        security_rule: [],
        tag: [],
        security_ai_prompt: [],
        osquery_pack_asset: [],
        osquery_saved_query: [],
      },
      elasticsearch: {
        ingest_pipeline: [],
        component_template: [],
        index_template: [],
        transform: [],
        ilm_policy: [],
        data_stream_ilm_policy: [],
        ml_model: [],
        knowledge_base: [],
        esql_view: [],
      },
    },
    status: 'not_installed',
    release: 'experimental',
    owner: {
      github: 'elastic/fleet',
    },
  };

  return mockPackage;
};
