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
import { I18nProvider } from '@kbn/i18n/react';
import { KibanaContextProvider } from '../../../../../../../../src/plugins/kibana_react/public';
import { TimelinesUIStart } from '../../../../../../../plugins/timelines/public';

/**
 * Render the Timeline Test app. Returns a cleanup function.
 */
export function renderApp(
  coreStart: CoreStart,
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
    coreStart: CoreStart;
    parameters: AppMountParameters;
    timelinesPluginSetup: TimelinesUIStart | null;
  }) => {
    const refetch = useRef();

    const setRefetch = useCallback((_refetch) => {
      refetch.current = _refetch;
    }, []);
    return (
      <I18nProvider>
        <Router history={parameters.history}>
          <KibanaContextProvider services={coreStart}>
            {(timelinesPluginSetup &&
              timelinesPluginSetup.getTGrid &&
              timelinesPluginSetup.getTGrid<'standalone'>({
                type: 'standalone',
                columns: [],
                indexNames: [],
                deletedEventIds: [],
                end: '',
                footerText: 'Events',
                filters: [],
                itemsPerPage: 50,
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
                unit: (n: number) => `${n}`,
              })) ??
              null}
          </KibanaContextProvider>
        </Router>
      </I18nProvider>
    );
  }
);
