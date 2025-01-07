/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  LogsExplorerController,
  LogsExplorerPluginStart,
} from '@kbn/logs-explorer-plugin/public';
import { useActor } from '@xstate/react';
import React, { useMemo } from 'react';
import { LogsExplorerTopNavMenu } from '../../components/logs_explorer_top_nav_menu';
import { ObservabilityLogsExplorerPageTemplate } from '../../components/page_template';
import { createLogsExplorerControllerWithCustomizations } from '../../logs_explorer_customizations';
import {
  ObservabilityLogsExplorerPageStateProvider,
  useObservabilityLogsExplorerPageStateContext,
} from '../../state_machines/observability_logs_explorer/src';
import { LazyOriginInterpreter } from '../../state_machines/origin_interpreter/src/lazy_component';
import { ObservabilityLogsExplorerHistory } from '../../types';
import { useBreadcrumbs } from '../../utils/breadcrumbs';
import { useKbnUrlStateStorageFromRouterContext } from '../../utils/kbn_url_state_context';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';

export const ObservabilityLogsExplorerMainRoute = () => {
  const { services } = useKibanaContextForPlugin();
  const { logsExplorer, notifications, appParams, analytics, i18n, theme, logsDataAccess } =
    services;
  const { history } = appParams;

  useBreadcrumbs();

  const urlStateStorageContainer = useKbnUrlStateStorageFromRouterContext();

  const createLogsExplorerController = useMemo(
    () =>
      createLogsExplorerControllerWithCustomizations(
        logsExplorer.createLogsExplorerController,
        services
      ),
    [logsExplorer.createLogsExplorerController, services]
  );

  return (
    <ObservabilityLogsExplorerPageStateProvider
      createLogsExplorerController={createLogsExplorerController}
      toasts={notifications.toasts}
      urlStateStorageContainer={urlStateStorageContainer}
      timeFilterService={services.data.query.timefilter.timefilter}
      analytics={services.analytics}
      logSourcesService={logsDataAccess.services.logSourcesService}
    >
      <LogsExplorerTopNavMenu />
      <LazyOriginInterpreter
        history={history}
        toasts={notifications.toasts}
        analytics={analytics}
        i18n={i18n}
        theme={theme}
      />
      <ConnectedContent />
    </ObservabilityLogsExplorerPageStateProvider>
  );
};

const ConnectedContent = React.memo(() => {
  const {
    services: {
      appParams: { history },
      logsExplorer,
    },
  } = useKibanaContextForPlugin();

  const [state] = useActor(useObservabilityLogsExplorerPageStateContext());

  if (state.matches('initialized')) {
    return (
      <InitializedContent
        logsExplorerController={state.context.controller}
        history={history}
        logsExplorer={logsExplorer}
      />
    );
  } else {
    return <InitializingContent />;
  }
});

const InitializingContent = React.memo(() => (
  <ObservabilityLogsExplorerPageTemplate>
    <EuiEmptyPrompt
      icon={<EuiLoadingLogo logo="logoKibana" size="xl" />}
      title={
        <FormattedMessage
          id="xpack.observabilityLogsExplorer.InitializingTitle"
          defaultMessage="Initializing the Logs Explorer"
        />
      }
    />
  </ObservabilityLogsExplorerPageTemplate>
));

const InitializedContent = React.memo(
  ({
    history,
    logsExplorer,
    logsExplorerController,
  }: {
    history: ObservabilityLogsExplorerHistory;
    logsExplorer: LogsExplorerPluginStart;
    logsExplorerController: LogsExplorerController;
  }) => {
    return (
      <ObservabilityLogsExplorerPageTemplate>
        <logsExplorer.LogsExplorer controller={logsExplorerController} scopedHistory={history} />
      </ObservabilityLogsExplorerPageTemplate>
    );
  }
);
