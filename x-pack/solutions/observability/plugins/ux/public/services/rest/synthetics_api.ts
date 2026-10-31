/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

export interface SyntheticsMonitorMatch {
  configId: string;
  name: string;
  url?: string;
}

interface SyntheticsMonitorHit {
  id?: string;
  config_id?: string;
  name?: string;
  url?: string;
}

const isForbidden = (err: unknown): boolean => {
  const typed = err as { response?: { status?: number }; body?: { statusCode?: number } };
  return typed.response?.status === 403 || typed.body?.statusCode === 403;
};

/** Best matching monitor for a page path, or null. `forbidden` when the user cannot list monitors. */
export const fetchSyntheticsMonitorMatch = async ({
  http,
  pagePath,
}: {
  http: HttpStart;
  pagePath: string;
}): Promise<{ match: SyntheticsMonitorMatch | null; forbidden: boolean }> => {
  const query = pagePath.split('?')[0].trim().slice(0, 128);
  if (!query) {
    return { match: null, forbidden: false };
  }
  try {
    const result = await http.get<{ monitors?: SyntheticsMonitorHit[] }>(
      '/api/synthetics/monitors',
      { query: { query, perPage: 5 } }
    );
    const monitor = result.monitors?.[0];
    const configId = monitor?.config_id || monitor?.id;
    if (!monitor || !configId) {
      return { match: null, forbidden: false };
    }
    return {
      match: {
        configId,
        name: monitor.name || configId,
        url: monitor.url,
      },
      forbidden: false,
    };
  } catch (err) {
    if (isForbidden(err)) {
      return { match: null, forbidden: true };
    }
    return { match: null, forbidden: false };
  }
};
