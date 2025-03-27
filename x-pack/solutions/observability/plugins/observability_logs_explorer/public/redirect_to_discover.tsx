/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Router } from '@kbn/shared-ux-router';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { DISCOVER_APP_ID } from '@kbn/deeplinks-analytics';
import { encode, safeDecode } from '@kbn/rison';

export const renderDiscoverRedirect = (core: CoreStart, appParams: AppMountParameters) => {
  ReactDOM.render(
    <Router history={appParams.history}>
      <DiscoverRedirect core={core} />
    </Router>,
    appParams.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(appParams.element);
  };
};

export const DiscoverRedirect = ({ core }: { core: CoreStart }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const pageStateEncoded = searchParams.get('pageState') || '';
  const pageState = (safeDecode(pageStateEncoded) || {}) as {
    time?: { from: string; to: string };
    query?: { language: string; query: string };
    filters?: any[];
    columns?: any[];
    refreshInterval?: { pause: boolean; value: number };
  };

  const gState = {
    time: pageState.time || { from: 'now-15m', to: 'now' },
    filters: [],
    refreshInterval: pageState.refreshInterval || { pause: true, value: 60000 },
  };

  const aState = {
    query: pageState.query,
    filters: Array.isArray(pageState.filters) ? pageState.filters : [],
    columns: Array.isArray(pageState.columns) ? pageState.columns : [],
  };

  const gEncoded = encode(gState);
  const aEncoded = encode(aState);

  const newSearch = `#/?_g=${gEncoded}&_a=${aEncoded}`;
  const path = `${location.pathname}${newSearch}`;

  core.application.navigateToApp(DISCOVER_APP_ID, { replace: true, path });

  return <></>;
};
