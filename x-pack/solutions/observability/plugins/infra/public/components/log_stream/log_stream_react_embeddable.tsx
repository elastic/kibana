/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useMemo } from 'react';
import { merge } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import {
  initializeTimeRangeManager,
  initializeTitleManager,
  timeRangeComparators,
  titleComparators,
  useFetchContext,
} from '@kbn/presentation-publishing';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { LogStream } from '@kbn/logs-shared-plugin/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import type { Query } from '@kbn/es-query';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { euiThemeVars } from '@kbn/ui-theme';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { FormattedMessage } from '@kbn/i18n-react';
import type { LogStreamApi, LogStreamSerializedState, Services } from './types';
import { datemathToEpochMillis } from '../../utils/datemath';
import { LOG_STREAM_EMBEDDABLE } from './constants';
import { useKibanaContextForPluginProvider } from '../../hooks/use_kibana';
import type { InfraClientStartDeps, InfraClientStartExports } from '../../types';

export function getLogStreamEmbeddableFactory(services: Services) {
  const factory: EmbeddableFactory<LogStreamSerializedState, LogStreamApi> = {
    type: LOG_STREAM_EMBEDDABLE,
    buildEmbeddable: async ({ initialState, finalizeApi, uuid, parentApi }) => {
      const timeRangeContext = initializeTimeRangeManager(initialState.rawState);
      const titleManager = initializeTitleManager(initialState.rawState);

      function serializeState() {
        return {
          rawState: {
            ...timeRangeContext.getLatestState(),
            ...titleManager.getLatestState(),
          },
        };
      }

      const unsavedChangesApi = initializeUnsavedChanges({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: merge(timeRangeContext.anyStateChange$, titleManager.anyStateChange$),
        getComparators: () => ({
          ...timeRangeComparators,
          ...titleComparators,
        }),
        onReset: (lastSaved) => {
          timeRangeContext.reinitializeState(lastSaved?.rawState);
          titleManager.reinitializeState(lastSaved?.rawState);
        },
      });

      const api = finalizeApi({
        ...timeRangeContext.api,
        ...titleManager.api,
        ...unsavedChangesApi,
        serializeState,
      });

      return {
        api,
        Component: () => {
          const darkMode = useKibanaIsDarkMode();
          const { filters, query, timeRange } = useFetchContext(api);
          const { startTimestamp, endTimestamp } = useMemo(() => {
            return {
              startTimestamp: timeRange ? datemathToEpochMillis(timeRange.from) : undefined,
              endTimestamp: timeRange ? datemathToEpochMillis(timeRange.to, 'up') : undefined,
            };
          }, [timeRange]);

          return !startTimestamp || !endTimestamp ? null : (
            <LogStreamEmbeddableProviders
              core={services.coreStart}
              plugins={services.pluginDeps}
              pluginStart={services.pluginStart}
              theme$={services.coreStart.theme.theme$}
            >
              <EuiThemeProvider darkMode={darkMode}>
                <div style={{ width: '100%', position: 'relative' }}>
                  <LogStream
                    logView={{ type: 'log-view-reference', logViewId: 'default' }}
                    startTimestamp={startTimestamp}
                    endTimestamp={endTimestamp}
                    height="100%"
                    query={query as Query | undefined}
                    filters={filters}
                  />
                  <DeprecationCallout />
                </div>
              </EuiThemeProvider>
            </LogStreamEmbeddableProviders>
          );
        },
      };
    },
  };
  return factory;
}

const DISMISSAL_STORAGE_KEY = 'observability:logStreamEmbeddableDeprecationCalloutDismissed';
const SAVED_SEARCH_DOCS_URL =
  'https://www.elastic.co/guide/en/kibana/current/save-open-search.html';

const DeprecationCallout = () => {
  const [isDismissed, setDismissed] = useLocalStorage(DISMISSAL_STORAGE_KEY, false);

  if (isDismissed) {
    return null;
  }

  return (
    <EuiCallOut
      color="warning"
      iconType="question"
      onDismiss={() => setDismissed(true)}
      css={{
        position: 'absolute',
        bottom: euiThemeVars.euiSizeM,
        right: euiThemeVars.euiSizeM,
        width: 'min(100%, 40ch)',
      }}
    >
      <p>
        <FormattedMessage
          id="xpack.infra.logsStreamEmbeddable.deprecationWarningDescription"
          defaultMessage="Logs Stream panels are no longer maintained. Try using {savedSearchDocsLink} for a similar visualization."
          values={{
            savedSearchDocsLink: (
              <EuiLink
                data-test-subj="infraDeprecationCalloutSavedSearchesLink"
                href={SAVED_SEARCH_DOCS_URL}
                target="_blank"
              >
                {i18n.translate(
                  'xpack.infra.logsStreamEmbeddable.deprecationWarningDescription.discoverSessionsLinkLabel',
                  { defaultMessage: 'Discover sessions' }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiCallOut>
  );
};

export interface LogStreamEmbeddableProvidersProps {
  core: CoreStart;
  pluginStart: InfraClientStartExports;
  plugins: InfraClientStartDeps;
  theme$: AppMountParameters['theme$'];
}

export const LogStreamEmbeddableProviders: FC<
  PropsWithChildren<LogStreamEmbeddableProvidersProps>
> = ({ children, core, pluginStart, plugins }) => {
  const KibanaContextProviderForPlugin = useKibanaContextForPluginProvider(
    core,
    plugins,
    pluginStart
  );

  return (
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProviderForPlugin services={{ ...core, ...plugins, ...pluginStart }}>
        {children}
      </KibanaContextProviderForPlugin>
    </KibanaRenderContextProvider>
  );
};
