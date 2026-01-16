/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type EarsOAuthProvider = 'google' | 'github' | 'notion' | 'microsoft';

export interface StartOAuthRequest {
  scope: string[];
}

export interface StartOAuthResponse {
  request_id: string;
  auth_url: string;
}

export interface FetchSecretsResponse {
  access_token: string;
}

export interface GoogleUserInfo {
  name: string;
  picture: string;
  email: string;
}
