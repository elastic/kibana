/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getAddMonitorCancelHref({
  search,
  monitorsHref,
  getUrlForApp,
}: {
  search: string;
  monitorsHref: string;
  getUrlForApp: (appId: string, options: { path: string }) => string;
}): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const returnAppId = params.get('returnAppId');
  const returnPath = params.get('returnPath');
  if (!returnAppId || !returnPath) {
    return monitorsHref;
  }
  return getUrlForApp(returnAppId, { path: returnPath });
}
