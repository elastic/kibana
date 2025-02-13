/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { map } from 'rxjs';
import {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { STREAMS_APP_ID } from '@kbn/deeplinks-observability/constants';
import type {
  ConfigSchema,
  StreamsAppPublicSetup,
  StreamsAppPublicStart,
  StreamsAppSetupDependencies,
  StreamsAppStartDependencies,
} from './types';
import { StreamsAppServices } from './services/types';

export class StreamsAppPlugin
  implements
    Plugin<
      StreamsAppPublicSetup,
      StreamsAppPublicStart,
      StreamsAppSetupDependencies,
      StreamsAppStartDependencies
    >
{
  logger: Logger;

  constructor(private readonly context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<StreamsAppStartDependencies, StreamsAppPublicStart>,
    pluginsSetup: StreamsAppSetupDependencies
  ): StreamsAppPublicSetup {
    pluginsSetup.observabilityShared.navigation.registerSections(
      pluginsSetup.streams.status$.pipe(
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
      updater$: pluginsSetup.streams.status$.pipe(
        map(({ status }): AppUpdater => {
          return (app) => {
            if (status !== 'enabled') {
              return {
                visibleIn: [],
                deepLinks: [],
              };
            }

            return {
              visibleIn: ['sideNav', 'globalSearch'],
              deepLinks:
                status === 'enabled'
                  ? [
                      {
                        id: 'streams',
                        title: i18n.translate('xpack.streams.streamsAppDeepLinkTitle', {
                          defaultMessage: 'Streams',
                        }),
                        path: '/',
                      },
                    ]
                  : [],
            };
          };
        })
      ),
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ renderApp }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices(),
        ]);

        const services: StreamsAppServices = {};

        return renderApp({
          coreStart,
          pluginsStart,
          services,
          appMountParameters,
          isServerless: this.context.env.packageInfo.buildFlavor === 'serverless',
        });
      },
    });

    return {};
  }

  start(coreStart: CoreStart, pluginsStart: StreamsAppStartDependencies): StreamsAppPublicStart {
    return {};
  }
}
