/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { JSON_HEADER as headers } from '../../../../../common/constants';
import { clearFlashMessages, flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { parseQueryParams } from '../../../shared/query_params';

export interface OAuthPreAuthServerProps {
  client_id: string;
  client_name: string;
  redirect_uri: string;
  response_type: string;
  scope: string;
  state: string;
  status: string;
}

export interface OAuthPreAuthorization {
  clientId: string;
  clientName: string;
  redirectUri: string;
  responseType: string;
  rawScopes: string;
  scopes: string[];
  state: string;
}

interface OAuthAuthorizeValues {
  dataLoading: boolean;
  buttonLoading: boolean;
  cachedPreAuth: OAuthPreAuthorization;
  hasError: boolean;
}

interface OAuthAuthorizeActions {
  setServerProps(serverProps: OAuthPreAuthServerProps): OAuthPreAuthServerProps;
  initializeOAuthPreAuth(queryString: string): string;
  allowOAuthAuthorization(): void;
  denyOAuthAuthorization(): void;
  setButtonNotLoading(): void;
  setHasError(): void;
}

export const oauthAuthorizeRoute = '/internal/workplace_search/oauth/authorize';

export const OAuthAuthorizeLogic = kea<MakeLogicType<OAuthAuthorizeValues, OAuthAuthorizeActions>>({
  path: ['enterprise_search', 'workplace_search', 'oauth_authorize_logic'],
  actions: {
    setServerProps: (serverProps: OAuthPreAuthServerProps) => serverProps,
    initializeOAuthPreAuth: (queryString: string) => queryString,
    allowOAuthAuthorization: null,
    denyOAuthAuthorization: null,
    setButtonNotLoading: null,
    setHasError: null,
  },
  reducers: {
    dataLoading: [
      true,
      {
        setServerProps: () => false,
        setHasError: () => false,
      },
    ],
    cachedPreAuth: [
      {} as OAuthPreAuthorization,
      {
        setServerProps: (_, serverProps) => transformServerPreAuth(serverProps),
      },
    ],
    buttonLoading: [
      false,
      {
        setButtonNotLoading: () => false,
        allowOAuthAuthorization: () => true,
        denyOAuthAuthorization: () => true,
      },
    ],
    hasError: [
      false,
      {
        setHasError: () => true,
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    initializeOAuthPreAuth: async (queryString: string) => {
      clearFlashMessages();
      const { http } = HttpLogic.values;
      const query = parseQueryParams(queryString);

      try {
        const response = await http.get<OAuthPreAuthServerProps>(oauthAuthorizeRoute, { query });

        if (response.status === 'redirect') {
          window.location.replace(response.redirect_uri);
        } else {
          actions.setServerProps(response);
        }
      } catch (e) {
        flashAPIErrors(e);
        actions.setHasError();
      }
    },
    denyOAuthAuthorization: async () => {
      const { http } = HttpLogic.values;
      const { cachedPreAuth } = values;

      try {
        const response = await http.delete<{ redirect_uri: string }>(oauthAuthorizeRoute, {
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
        actions.setButtonNotLoading();
      }
    },
    allowOAuthAuthorization: async () => {
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
        actions.setButtonNotLoading();
      }
    },
  }),
});

export const transformServerPreAuth = (
  serverProps: OAuthPreAuthServerProps
): OAuthPreAuthorization => ({
  clientId: serverProps.client_id,
  clientName: serverProps.client_name,
  redirectUri: serverProps.redirect_uri,
  responseType: serverProps.response_type,
  rawScopes: serverProps.scope,
  scopes: serverProps.scope.split(', '),
  state: serverProps.state,
});
