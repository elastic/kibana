/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Supported OAuth providers for EARS
 */
export enum EarsOAuthProvider {
  Google = 'google',
  GitHub = 'github',
  Notion = 'notion',
  Microsoft = 'microsoft',
}

/**
 * All supported EARS OAuth providers as a tuple for schema validation
 */
export const ALL_EARS_OAUTH_PROVIDERS = [
  EarsOAuthProvider.Google,
  EarsOAuthProvider.GitHub,
  EarsOAuthProvider.Notion,
  EarsOAuthProvider.Microsoft,
] as const;

export interface StartOAuthRequest {
  scope: string[];
}

export const startOAuthResponseSchema = z.object({
  request_id: z.string(),
  auth_url: z.string().url(),
});

export type StartOAuthResponse = z.infer<typeof startOAuthResponseSchema>;

export const fetchSecretsResponseSchema = z.object({
  access_token: z.string(),
});

export type FetchSecretsResponse = z.infer<typeof fetchSecretsResponseSchema>;

export interface GoogleUserInfo {
  name: string;
  picture: string;
  email: string;
}
