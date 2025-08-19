/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { JSON_HEADER as headers } from '../../../../../common/constants';
import { SearchOAuth } from '../../../../../common/types';
import { clearFlashMessages, flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { parseQueryParams } from '../../../shared/query_params';

import {
  OAuthPreAuthServerProps,
  OAuthPreAuthorization,
  oauthAuthorizeRoute,
  transformServerPreAuth,
} from '../oauth_authorize/oauth_authorize_logic';

interface SearchAuthorizeValues {
  redirectPending: boolean;
  cachedPreAuth: OAuthPreAuthorization;
}

interface SearchAuthorizeActions {
  setServerProps(serverProps: OAuthPreAuthServerProps): OAuthPreAuthServerProps;
  initializeSearchAuth(searchOAuth: SearchOAuth, search: string): [SearchOAuth, string];
  authorizeSearch(): void;
  setRedirectNotPending(): void;
}

export const SearchAuthorizeLogic = kea<
  MakeLogicType<SearchAuthorizeValues, SearchAuthorizeActions>
>({
  path: ['enterprise_search', 'workplace_search', 'search_authorize_logic'],
  actions: {
    setServerProps: (serverProps: OAuthPreAuthServerProps) => serverProps,
    initializeSearchAuth: (searchOAuth: SearchOAuth, search: string) => [searchOAuth, search],
    authorizeSearch: null,
    setRedirectNotPending: null,
  },
  reducers: {
    redirectPending: [
      true,
      {
        setRedirectNotPending: () => false,
      },
    ],
    cachedPreAuth: [
      {} as OAuthPreAuthorization,
      {
        setServerProps: (_, serverProps) => transformServerPreAuth(serverProps),
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    initializeSearchAuth: async ([searchOAuth, search]) => {
      clearFlashMessages();
      const { http } = HttpLogic.values;
      const { state } = parseQueryParams(search);

      const query = {
        client_id: searchOAuth.clientId,
        response_type: 'code',
        redirect_uri: searchOAuth.redirectUrl,
        scope: 'default_search',
        state,
      };

      try {
        const response = await http.get<OAuthPreAuthServerProps>(oauthAuthorizeRoute, { query });

        if (response.status === 'redirect') {
          window.location.replace(response.redirect_uri);
        } else {
          actions.setServerProps(response);
        }
      } catch (e) {
        flashAPIErrors(e);
        actions.setRedirectNotPending();
      }
    },
    setServerProps: () => {
      actions.authorizeSearch();
    },
    authorizeSearch: async () => {
      const { http } = HttpLogic.values;
      const { cachedPreAuth } = values;

      try {
        const response = await http.post<{ redirect_uri: string }>(oauthAuthorizeRoute, {
          body: JSON.stringify({
            client_id: cachedPreAuth.clientId,
            response_type: cachedPreAuth.responseType,
            redirect_uri: cachedPreAuth.redirectUri,
            scope: cachedPreAuth.rawScopes,
            state: cachedPreAuth.state,
          }),
          headers,
        });

        window.location.replace(response.redirect_uri);
      } catch (e) {
        flashAPIErrors(e);
        actions.setRedirectNotPending();
      }
    },
  }),
});
