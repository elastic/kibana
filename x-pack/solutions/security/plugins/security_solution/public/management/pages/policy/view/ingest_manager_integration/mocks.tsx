/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useEffect } from 'react';
import type { Action, Reducer } from 'redux';
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
import type { ExperimentalFeatures } from '../../../../../../common/experimental_features';
import { allowedExperimentalValues } from '../../../../../../common/experimental_features';
import type { State } from '../../../../../common/store';
import { mockGlobalState } from '../../../../../common/mock';
import { managementReducer } from '../../../../store/reducer';
import { appReducer } from '../../../../../common/store/app';
import { ExperimentalFeaturesService } from '../../../../../common/experimental_features_service';
import { RenderContextProviders } from '../../../../../common/components/with_security_context/render_context_providers';
import type { AppAction } from '../../../../../common/store/actions';

// Defined a private custom reducer that reacts to an action that enables us to update the
// store with new values for technical preview features/flags. Because the `action.type` is a `Symbol`,
// and its not exported the action can only be `dispatch`'d from this module
const UpdateExperimentalFeaturesTestActionType = Symbol('updateExperimentalFeaturesTestAction');

type UpdateExperimentalFeaturesTestAction = Action<
  typeof UpdateExperimentalFeaturesTestActionType
> & {
  payload: Partial<ExperimentalFeatures>;
};

const experimentalFeaturesReducer: Reducer<
  State['app'],
  AppAction | UpdateExperimentalFeaturesTestAction
> = (state = mockGlobalState.app, action) => {
  if (action.type === UpdateExperimentalFeaturesTestActionType) {
    return {
      ...state,
      enableExperimental: {
        ...state.enableExperimental,
        ...action.payload,
      },
    };
  }
  return state;
};

export const createFleetContextRendererMock = (): AppContextTestRender => {
  ExperimentalFeaturesService.init({
    experimentalFeatures: { ...allowedExperimentalValues },
  });

  const mockedContext = createAppRootMockRenderer();
  const { coreStart, depsStart, queryClient, startServices } = mockedContext;
  const store = createFleetContextReduxStore({
    coreStart,
    depsStart,
    reducersObject: {
      management: managementReducer,
      app: (state, action: AppAction | UpdateExperimentalFeaturesTestAction) => {
        return appReducer(experimentalFeaturesReducer(state, action), action);
      },
    },
    preloadedState: {
      // @ts-expect-error TS2322
      management: undefined,
      // @ts-expect-error TS2322
      app: {
        enableExperimental: ExperimentalFeaturesService.get(),
      },
    },
    additionalMiddleware: [mockedContext.middlewareSpy.actionSpyMiddleware],
  });

  const Wrapper: RenderOptions['wrapper'] = ({ children }: PropsWithChildren<unknown>) => {
    useEffect(() => {
      return () => {
        // When the component un-mounts, reset the Experimental features since
        // `ExperimentalFeaturesService` is a global singleton
        ExperimentalFeaturesService.init({
          experimentalFeatures: { ...allowedExperimentalValues },
        });
      };
    }, []);

    startServices.application.capabilities = deepFreeze({
      ...startServices.application.capabilities,
      siemV2: { show: true, crud: true },
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

  const setExperimentalFlag: AppContextTestRender['setExperimentalFlag'] = (flags) => {
    // TODO: Is this context even using the Redux store `app` namespace?
    //    `ExperimentalFeaturesService` seems to be used instead
    store.dispatch({
      type: UpdateExperimentalFeaturesTestActionType,
      payload: flags,
    });

    ExperimentalFeaturesService.init({
      experimentalFeatures: { ...allowedExperimentalValues, ...flags },
    });
  };

  return {
    ...mockedContext,
    store,
    render,
    setExperimentalFlag,
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
