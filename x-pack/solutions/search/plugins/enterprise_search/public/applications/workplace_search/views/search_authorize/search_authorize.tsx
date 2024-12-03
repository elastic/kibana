/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { Location } from 'history';
import { useActions, useValues } from 'kea';

import { EuiPage, EuiPageBody } from '@elastic/eui';

import { FlashMessages } from '../../../shared/flash_messages';
import { Loading } from '../../../shared/loading';

import { AppLogic } from '../../app_logic';

import { SearchAuthorizeLogic } from './search_authorize_logic';

export const SearchAuthorize: React.FC = () => {
  const { search } = useLocation() as Location;
  const { initializeSearchAuth } = useActions(SearchAuthorizeLogic);

  const { searchOAuth } = useValues(AppLogic);
  const { redirectPending } = useValues(SearchAuthorizeLogic);

  useEffect(() => {
    if (searchOAuth.clientId) {
      initializeSearchAuth(searchOAuth, search);
    }
  }, [searchOAuth]);

  if (redirectPending) return <Loading />;

  return (
    <EuiPage restrictWidth>
      <EuiPageBody>
        <FlashMessages />
      </EuiPageBody>
    </EuiPage>
  );
};
