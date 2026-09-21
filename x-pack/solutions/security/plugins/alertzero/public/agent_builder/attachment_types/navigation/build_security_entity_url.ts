/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';
import type { ApplicationStart } from '@kbn/core-application-browser';

const SECURITY_APP_ID = 'securitySolutionUI';

/**
 * Security entity detail page URL for a `host.*` or `user.*` chip. Returns
 * `undefined` for `service.*` fields (no Security entity page exists for
 * services) and when `getUrlForApp` isn't wired (older callers, tests), so
 * the caller can fall back to its Discover ES|QL link.
 */
export const buildSecurityEntityUrl = ({
  getUrlForApp,
  field,
  value,
}: {
  getUrlForApp?: ApplicationStart['getUrlForApp'];
  field: string;
  value: string;
}): string | undefined => {
  if (!getUrlForApp) {
    return undefined;
  }

  const deepLinkId = field.startsWith('host.')
    ? SecurityPageName.hosts
    : field.startsWith('user.')
    ? SecurityPageName.users
    : undefined;

  if (!deepLinkId) {
    return undefined;
  }

  return getUrlForApp(SECURITY_APP_ID, {
    deepLinkId,
    path: `/name/${encodeURIComponent(value)}`,
  });
};
