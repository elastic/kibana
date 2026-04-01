/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getIndexPattern(namespace: string): string {
  return `logs-okta.system-${namespace}`;
}

/**
 * Okta event actions that represent a user authenticating to an application.
 * These events have AppInstance-type entries in okta.target, making them the
 * right signal for user→service communicates_with relationships.
 */
export const OKTA_AUTH_EVENT_ACTIONS = [
  'user.authentication.sso',
  'user.authentication.auth_via_mfa',
  'user.session.start',
];
