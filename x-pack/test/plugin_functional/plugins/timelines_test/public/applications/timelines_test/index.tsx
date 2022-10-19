/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Router } from 'react-router-dom';
import React from 'react';
import ReactDOM from 'react-dom';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { TimelinesUIStart } from '@kbn/timelines-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EntityType } from '@kbn/timelines-plugin/common';

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
    return (
      <I18nProvider>
        <Router history={parameters.history}>
          <KibanaContextProvider services={coreStart}>
            <EuiThemeProvider>
              {(timelinesPluginSetup &&
                timelinesPluginSetup.getTGrid &&
                timelinesPluginSetup.getTGrid<'embedded'>({
                  type: 'embedded',
                  columns: [],
                  indexNames: [],
                  deletedEventIds: [],
                  disabledCellActions: [],
                  end: '',
                  filters: [],
                  itemsPerPageOptions: [1, 2, 3],
                  renderCellValue: () => <div data-test-subj="timeline-wrapper">test</div>,
                  sort: [],
                  leadingControlColumns: [],
                  trailingControlColumns: [],
                  query: {
                    query: '',
                    language: 'kuery',
                  },
                  start: '',
                  rowRenderers: [],
                  runtimeMappings: {},
                  filterStatus: 'open',
                  unit: (n: number) => `${n}`,
                  additionalFilters: [],
                  appId: '',
                  browserFields: {},
                  entityType: EntityType.ALERTS,
                  globalFullScreen: false,
                  id: 'test',
                  hasAlertsCrud: false,
                  indexPattern: { fields: [], title: 'test' },
                  isLive: true,
                  isLoadingIndexPattern: false,
                  itemsPerPage: 20,
                  setQuery: () => {},
                  tGridEventRenderedViewEnabled: false,
                })) ??
                null}
            </EuiThemeProvider>
          </KibanaContextProvider>
        </Router>
      </I18nProvider>
    );
  }
);
