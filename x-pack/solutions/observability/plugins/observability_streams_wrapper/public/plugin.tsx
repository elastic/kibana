/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { from, map, switchMap } from 'rxjs';
import {
  AppUpdater,
  CoreSetup,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { STREAMS_APP_ID } from '@kbn/deeplinks-observability/constants';
import React from 'react';
import ReactDOM from 'react-dom';
import { APP_WRAPPER_CLASS, type AppMountParameters, type CoreStart } from '@kbn/core/public';
import { css } from '@emotion/css';
import { StreamsApplicationComponentType } from '@kbn/streams-app-plugin/public';
import { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { NavigationPublicStart } from '@kbn/navigation-plugin/public/types';
import type {
  ConfigSchema,
  ObservabilityStreamsWrapperPublicSetup,
  ObservabilityStreamsWrapperPublicStart,
  ObservabilityStreamsWrapperSetupDependencies,
  ObservabilityStreamsWrapperStartDependencies,
} from './types';
import { createObservabilityStreamsAppPageTemplate } from './observability_streams_page_template';

export const renderApp = ({
  appMountParameters,
  StreamsApplicationComponent,
  observabilityShared,
  navigation,
}: {
  appMountParameters: AppMountParameters;
  StreamsApplicationComponent: StreamsApplicationComponentType;
  observabilityShared: ObservabilitySharedPluginStart;
  navigation: NavigationPublicStart;
}) => {
  const { element } = appMountParameters;

  const appWrapperClassName = css`
    overflow: auto;
  `;
  const appWrapperElement = document.getElementsByClassName(APP_WRAPPER_CLASS)[1];
  appWrapperElement.classList.add(appWrapperClassName);

  ReactDOM.render(
    <StreamsApplicationComponent
      appMountParameters={appMountParameters}
      PageTemplate={createObservabilityStreamsAppPageTemplate({ observabilityShared, navigation })}
    />,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
    appWrapperElement.classList.remove(APP_WRAPPER_CLASS);
  };
};

export class ObservabilityStreamsWrapperPlugin
  implements
    Plugin<
      ObservabilityStreamsWrapperPublicSetup,
      ObservabilityStreamsWrapperPublicStart,
      ObservabilityStreamsWrapperSetupDependencies,
      ObservabilityStreamsWrapperStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<
      ObservabilityStreamsWrapperStartDependencies,
      ObservabilityStreamsWrapperPublicStart
    >,
    pluginsSetup: ObservabilityStreamsWrapperSetupDependencies
  ): ObservabilityStreamsWrapperPublicSetup {
    const startServicesPromise = coreSetup.getStartServices();

    pluginsSetup.observabilityShared.navigation.registerSections(
      from(startServicesPromise).pipe(
        switchMap(([_, pluginsStart]) =>
          pluginsStart.streams.status$.pipe(
            map(({ status }) => {
              if (status !== 'enabled') {
                return [];
              }

              return [
                {
                  label: '',
                  sortKey: 101,
                  entries: [
                    {
                      label: i18n.translate('xpack.streams.streamsAppLinkTitle', {
                        defaultMessage: 'Streams',
                      }),
                      app: STREAMS_APP_ID,
                      path: '/',
                      isTechnicalPreview: true,
                      matchPath(currentPath: string) {
                        return ['/', ''].some((testPath) => currentPath.startsWith(testPath));
                      },
                    },
                  ],
                },
              ];
            })
          )
        )
      )
    );

    coreSetup.application.register({
      id: STREAMS_APP_ID,
      title: i18n.translate('xpack.streams.appTitle', {
        defaultMessage: 'Streams',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/streams',
      category: DEFAULT_APP_CATEGORIES.observability,
      order: 8001,
      updater$: from(startServicesPromise).pipe(
        switchMap(([_, pluginsStart]) =>
          pluginsStart.streams.status$.pipe(
            map(({ status }): AppUpdater => {
              return (app) => {
                if (status !== 'enabled') {
                  return {
                    visibleIn: [],
                  };
                }

                return {
                  visibleIn: ['sideNav', 'globalSearch'],
                };
              };
            })
          )
        )
      ),
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [_, pluginsStart] = await coreSetup.getStartServices();

        const StreamsApplicationComponent =
          pluginsStart.streamsApp.createStreamsApplicationComponent();

        return renderApp({
          StreamsApplicationComponent,
          appMountParameters,
          observabilityShared: pluginsStart.observabilityShared,
          navigation: pluginsStart.navigation,
        });
      },
    });

    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: ObservabilityStreamsWrapperStartDependencies
  ): ObservabilityStreamsWrapperPublicStart {
    return {};
  }
}
