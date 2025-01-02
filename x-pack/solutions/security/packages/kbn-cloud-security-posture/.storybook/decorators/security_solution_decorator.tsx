/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DiscoverInTimelineContextProvider } from '@kbn/security-solution-plugin/public/common/components/discover_in_timeline/provider';

export const SecuritySolutionStorybookDecorator = (Story: ComponentType) => {
  const store = configureStore({
    reducer: {
      sourcerer: () => ({
        /** default security-solution data view */
        defaultDataView: {
          id: '',
          title: '',
          fields: [],
          getName: () => '',
        },
        /** all Kibana data views, including security-solution */
        kibanaDataViews: [],
        /** security solution signals index name */
        signalIndexName: '',
        /** security solution signal index mapping state */
        signalIndexMappingOutdated: null,
        /** sourcerer scope data by id */
        sourcererScopes: {},
      }),
      inputs: () => ({
        global: {
          timerange: {},
        },
        timeline: {
          fullScreen: false,
        },
      }),
      timeline: () => ({
        timelineById: {},
      }),
      discover: () => ({
        app: {},
      }),
    },
  });

  return (
    <ReduxStoreProvider store={store}>
      <DiscoverInTimelineContextProvider>
        <Story />
      </DiscoverInTimelineContextProvider>
    </ReduxStoreProvider>
  );
};
