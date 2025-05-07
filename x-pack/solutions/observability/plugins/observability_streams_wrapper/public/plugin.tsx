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
  ScopedHistory,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { STREAMS_APP_ID } from '@kbn/deeplinks-observability/constants';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { APP_WRAPPER_CLASS, type AppMountParameters, type CoreStart } from '@kbn/core/public';
import { css } from '@emotion/css';
import { StreamsApplicationComponentType } from '@kbn/streams-app-plugin/public';
import { ObservabilitySharedPluginStart } from '@kbn/observability-shared-plugin/public';
import { NavigationPublicStart } from '@kbn/navigation-plugin/public/types';
import { useAbortableAsync } from '@kbn/react-hooks';
import { isGroupStreamDefinition, isGroupStreamGetResponse } from '@kbn/streams-schema';
import { EuiLink } from '@elastic/eui';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { createObservabilityStreamsAppPageTemplate } from './observability_streams_page_template';
import type {
  ConfigSchema,
  ObservabilityStreamsWrapperPublicSetup,
  ObservabilityStreamsWrapperPublicStart,
  ObservabilityStreamsWrapperSetupDependencies,
  ObservabilityStreamsWrapperStartDependencies,
} from './types';

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
  public localHistory?: ScopedHistory<unknown>;

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

        this.localHistory = appMountParameters.history;

        const onunmout = renderApp({
          StreamsApplicationComponent,
          appMountParameters,
          observabilityShared: pluginsStart.observabilityShared,
          navigation: pluginsStart.navigation,
        });
        return () => {
          this.localHistory = undefined;
          onunmout();
        };
      },
    });

    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: ObservabilityStreamsWrapperStartDependencies
  ): ObservabilityStreamsWrapperPublicStart {
    // easiest way to smuggle a component into another place that doesn't have access to corestart
    (window as any).GroupStreamNavigation = createGroupStreamNavigationComponent(
      coreStart,
      pluginsStart,
      this
    );
    return {};
  }
}

const createGroupStreamNavigationComponent =
  (
    coreStart: CoreStart,
    pluginsStart: ObservabilityStreamsWrapperStartDependencies,
    plugin: ObservabilityStreamsWrapperPlugin
  ) =>
  () => {
    const { streamsRepositoryClient } = pluginsStart.streams;

    // This state obviously isn't in sync with the Streams app breadcrumbs...
    const [currentDashboard, setCurrentDashboard] = useState<string>('');
    const [currentStream, setCurrentStream] = useLocalStorage<string | undefined>(
      'observability_streams_wrapper.current_stream',
      undefined
    );

    const { value } = useAbortableAsync(
      async ({ signal }) => {
        const { streams } = await streamsRepositoryClient.fetch('GET /internal/streams', {
          signal,
        });
        return streams;
      },
      [streamsRepositoryClient]
    );

    const { value: currentStreamValue } = useAbortableAsync(
      async ({ signal }) => {
        if (!currentStream) {
          return null;
        }
        return streamsRepositoryClient.fetch('GET /api/streams/{name} 2023-10-31', {
          signal,
          params: {
            path: {
              name: currentStream,
            },
          },
        });
      },
      [currentStream, streamsRepositoryClient]
    );

    if (!value) {
      return null;
    }

    if (!currentStream) {
      // find the group streams of type product and render links to them
      const groupStreams = value.filter((stream) => {
        const def = stream.stream;
        return isGroupStreamDefinition(def) && def.group.category === 'products';
      });

      return (
        <div style={{ marginBottom: '16px' }}>
          <h2>
            {i18n.translate('xpack.streams.createGroupStreamNavigationComponent.h2.productsLabel', {
              defaultMessage: 'Products',
            })}
          </h2>
          {groupStreams.map((stream) => {
            const groupStream = stream.stream;
            return (
              <div key={groupStream.name}>
                <EuiLink
                  data-test-subj="observabilityStreamsWrapperCreateGroupStreamNavigationComponentLink"
                  onClick={() => {
                    setCurrentStream(groupStream.name);
                    if (plugin.localHistory) {
                      plugin.localHistory.push(`/${groupStream.name}`);
                    } else {
                      coreStart.application.navigateToApp(STREAMS_APP_ID, {
                        path: `/${groupStream.name}`,
                      });
                    }
                  }}
                >
                  {groupStream.name}
                </EuiLink>
              </div>
            );
          })}
        </div>
      );
    }

    // upstream streams are other group streams that link to the current stream. Use the list of streams to calculate
    const upstreamStreams = currentStream
      ? value.filter((stream) => {
          const def = stream.stream;
          if (!isGroupStreamDefinition(def)) {
            return false;
          }
          return def.group.relationships.some((relationship) => {
            return relationship.name === currentStream;
          });
        })
      : [];
    const downstreamStreams =
      currentStream && currentStreamValue && isGroupStreamGetResponse(currentStreamValue)
        ? currentStreamValue.stream.group.relationships.map((relationship) => {
            return relationship.name;
          })
        : [];

    // render upstream streams, then current stream, then downstream streams
    return (
      <div style={{ marginBottom: '16px' }}>
        <EuiLink
          data-test-subj="observabilityStreamsWrapperCreateGroupStreamNavigationComponentAllLink"
          onClick={() => {
            setCurrentStream('');
            setCurrentDashboard('');
            coreStart.application.navigateToApp(STREAMS_APP_ID, {
              path: '/',
            });
          }}
        >
          {i18n.translate('xpack.streams.createGroupStreamNavigationComponent.allLinkLabel', {
            defaultMessage: 'All products',
          })}
        </EuiLink>

        {upstreamStreams.map((stream) => {
          const groupStream = stream.stream;
          return (
            <div key={groupStream.name}>
              <EuiLink
                data-test-subj="observabilityStreamsWrapperCreateGroupStreamNavigationComponentLink"
                onClick={() => {
                  setCurrentStream(groupStream.name);
                  setCurrentDashboard('');
                  if (plugin.localHistory) {
                    plugin.localHistory.push(`/${groupStream.name}`);
                  } else {
                    coreStart.application.navigateToApp(STREAMS_APP_ID, {
                      path: `/${groupStream.name}`,
                    });
                  }
                }}
              >
                {groupStream.name}
              </EuiLink>
            </div>
          );
        })}

        <div style={{ marginLeft: upstreamStreams.length === 0 ? '0' : '8px' }}>
          <EuiLink
            css={{
              fontWeight: currentDashboard ? 'normal' : 'bold',
              color: currentDashboard ? '#1750B' : 'black',
            }}
            onClick={() => {
              setCurrentDashboard('');
              if (plugin.localHistory) {
                plugin.localHistory.push(`/${currentStream}`);
              } else {
                coreStart.application.navigateToApp(STREAMS_APP_ID, {
                  path: `/${currentStream}`,
                });
              }
            }}
            data-test-subj="observabilityStreamsWrapperCreateGroupStreamNavigationComponentLink"
          >
            {currentStream}
          </EuiLink>
        </div>

        {downstreamStreams.map((stream) => {
          return (
            <div key={stream} style={{ marginLeft: upstreamStreams.length === 0 ? '8px' : '16px' }}>
              <EuiLink
                data-test-subj="observabilityStreamsWrapperCreateGroupStreamNavigationComponentLink"
                onClick={() => {
                  setCurrentStream(stream);
                  setCurrentDashboard('');
                  if (plugin.localHistory) {
                    plugin.localHistory.push(`/${stream}`);
                  } else {
                    coreStart.application.navigateToApp(STREAMS_APP_ID, {
                      path: `/${stream}`,
                    });
                  }
                }}
              >
                {stream}
              </EuiLink>
            </div>
          );
        })}

        {currentStream && currentStreamValue && currentStreamValue.dashboards.length !== 0 && (
          <div
            style={{
              marginLeft:
                upstreamStreams.length === 0 || downstreamStreams.length === 0 ? '8px' : '16px',
              marginTop: '18px',
            }}
          >
            {currentStreamValue.dashboards.map((dashboard) => (
              <DashboardLink
                setCurrentDashboard={setCurrentDashboard}
                currentDashboard={currentDashboard}
                key={dashboard}
                id={dashboard}
                plugin={plugin}
                stream={currentStream}
                coreStart={coreStart}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

function DashboardLink({
  id,
  plugin,
  stream,
  coreStart,
  currentDashboard,
  setCurrentDashboard,
}: {
  id: string;
  plugin: ObservabilityStreamsWrapperPlugin;
  stream: string;
  coreStart: CoreStart;
  currentDashboard: string;
  setCurrentDashboard: (value: string) => void;
}) {
  const {
    services: { http },
  } = useKibana();

  const [dashboardTitle, setDashboardTitle] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      const response = await http?.fetch(`/api/dashboards/dashboard/${id}`);
      setDashboardTitle((response as any).item.attributes.title);
    }

    loadDashboard();
  }, [id, http]);

  const handleClick = () => {
    setCurrentDashboard(id);
    if (plugin.localHistory) {
      plugin.localHistory.push(`/${stream}/dashboard/${id}`);
    } else {
      coreStart.application.navigateToApp(STREAMS_APP_ID, {
        path: `/${stream}/dashboard/${id}`,
      });
    }
  };

  return (
    <EuiLink
      data-test-subj="observabilityStreamsWrapperDashboardLinkLink"
      css={{
        fontWeight: id === currentDashboard ? 'bold' : 'normal',
        color: id === currentDashboard ? 'black' : '#1750B',
      }}
      onClick={handleClick}
    >
      {dashboardTitle}
    </EuiLink>
  );
}
