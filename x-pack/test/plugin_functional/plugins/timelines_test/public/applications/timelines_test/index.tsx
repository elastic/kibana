/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Router } from 'react-router-dom';
import React, { useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from 'kibana/public';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
import { EuiThemeProvider } from '../../../../../../../../src/plugins/kibana_react/common';
import { TimelinesUIStart } from '../../../../../../../plugins/timelines/public';
import { DataPublicPluginStart } from '../../../../../../../../src/plugins/data/public';

type CoreStartTimelines = CoreStart & { data: DataPublicPluginStart };

/**
 * Render the Timeline Test app. Returns a cleanup function.
 */
export function renderApp(
  coreStart: CoreStartTimelines,
  parameters: AppMountParameters,
  timelinesPluginSetup: TimelinesUIStart | null
) {
  ReactDOM.render(
    <AppRoot
      coreStart={coreStart}
      parameters={parameters}
      timelinesPluginSetup={timelinesPluginSetup}
    />,
    parameters.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(parameters.element);
  };
}

const AppRoot = React.memo(
  ({
    coreStart,
    parameters,
    timelinesPluginSetup,
  }: {
    coreStart: CoreStartTimelines;
    parameters: AppMountParameters;
    timelinesPluginSetup: TimelinesUIStart | null;
  }) => {
    const refetch = useRef();

    const setRefetch = useCallback((_refetch) => {
      refetch.current = _refetch;
    }, []);

    const hasAlertsCrudPermissions = useCallback(() => true, []);

    return (
      <I18nProvider>
        <Router history={parameters.history}>
          <KibanaContextProvider services={coreStart}>
            <EuiThemeProvider>
              {(timelinesPluginSetup &&
                timelinesPluginSetup.getTGrid &&
                timelinesPluginSetup.getTGrid<'standalone'>({
                  type: 'standalone',
                  columns: [],
                  indexNames: [],
                  deletedEventIds: [],
                  disabledCellActions: [],
                  end: '',
                  footerText: 'Events',
                  filters: [],
                  hasAlertsCrudPermissions,
                  itemsPerPageOptions: [1, 2, 3],
                  loadingText: 'Loading events',
                  renderCellValue: () => <div data-test-subj="timeline-wrapper">test</div>,
                  sort: [],
                  leadingControlColumns: [],
                  trailingControlColumns: [],
                  query: {
                    query: '',
                    language: 'kuery',
                  },
                  setRefetch,
                  start: '',
                  rowRenderers: [],
                  runtimeMappings: {},
                  filterStatus: 'open',
                  unit: (n: number) => `${n}`,
                })) ??
                null}
            </EuiThemeProvider>
          </KibanaContextProvider>
        </Router>
      </I18nProvider>
    );
  }
);
