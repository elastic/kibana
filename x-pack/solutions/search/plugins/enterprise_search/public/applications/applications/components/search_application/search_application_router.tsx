/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Redirect, useParams } from 'react-router-dom';

import { useActions } from 'kea';

import { Routes, Route } from '@kbn/shared-ux-router';

import { generateEncodedPath } from '../../../shared/encode_path_params';
import {
  SEARCH_APPLICATION_PATH,
  SEARCH_APPLICATION_TAB_PATH,
  SearchApplicationViewTabs,
} from '../../routes';

import { SearchApplicationNameLogic } from './search_application_name_logic';
import { SearchApplicationView } from './search_application_view';

export const SearchApplicationRouter: React.FC = () => {
  const searchApplicationName = decodeURIComponent(
    useParams<{ searchApplicationName: string }>().searchApplicationName
  );
  const searchApplicationNameLogic = SearchApplicationNameLogic({ searchApplicationName });
  const { setSearchApplicationName } = useActions(searchApplicationNameLogic);

  useEffect(() => {
    const unmountName = searchApplicationNameLogic.mount();

    return () => {
      unmountName();
    };
  }, []);
  useEffect(() => {
    setSearchApplicationName(searchApplicationName);
  }, [searchApplicationName]);

  return (
    <Routes>
      <Redirect
        from={SEARCH_APPLICATION_PATH}
        to={generateEncodedPath(SEARCH_APPLICATION_TAB_PATH, {
          searchApplicationName,
          tabId: SearchApplicationViewTabs.DOCS_EXPLORER,
        })}
        exact
      />
      <Route path={SEARCH_APPLICATION_TAB_PATH}>
        <SearchApplicationView />
      </Route>
    </Routes>
  );
};
