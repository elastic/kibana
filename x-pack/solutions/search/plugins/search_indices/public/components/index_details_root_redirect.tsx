/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useLocation, useParams, generatePath } from 'react-router-dom';
import {
  SEARCH_INDICES_DETAILS_PATH,
  SearchIndexDetailsTabs,
  SEARCH_INDICES_DETAILS_TABS_PATH,
} from '../routes';

export const IndexDetailsRootRedirect: React.FC = () => {
  const location = useLocation();
  const { indexName } = useParams<{ indexName: string }>();

  return (
    <Redirect
      exact
      from={`${SEARCH_INDICES_DETAILS_PATH}/`}
      to={
        generatePath(SEARCH_INDICES_DETAILS_TABS_PATH, {
          indexName,
          tabId: SearchIndexDetailsTabs.DATA,
        }) + location.search
      }
    />
  );
};
