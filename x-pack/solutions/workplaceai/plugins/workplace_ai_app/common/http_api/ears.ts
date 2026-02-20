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

// Exchange token
export interface ExchangeCodeRequest {
  code: string;
}

export const exchangeCodeResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
});

export type ExchangeCodeResponse = z.infer<typeof exchangeCodeResponseSchema>;

// Refresh Token
export interface RefreshTokenRequest {
  refresh_token: string;
}

export const refreshTokenResponseSchema = z.object({
  access_token: z.string(),
});

export type RefreshTokenResponse = z.infer<typeof refreshTokenResponseSchema>;

// Revoke Token
export interface RevokeTokenRequest {
  token: string;
}

export const revokeTokenResponseSchema = z.object({});

export type RevokeTokenResponse = z.infer<typeof revokeTokenResponseSchema>;

export interface GoogleUserInfo {
  picture: string;
  email: string;
}
