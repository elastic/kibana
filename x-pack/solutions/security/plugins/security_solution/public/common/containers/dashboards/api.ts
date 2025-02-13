/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import { INTERNAL_DASHBOARDS_URL } from '../../../../common/constants';

export interface Dashboard {
  id: string;
  type: string;
  attributes: {
    title: string;
    description: string;
  };
  references: Array<{ name: string; type: string; id: string }>;
}

export const getDashboardsByTagIds = (
  { http, tagIds }: { http: HttpSetup; tagIds: string[] },
  abortSignal?: AbortSignal
): Promise<Dashboard[] | null> =>
  http.post(INTERNAL_DASHBOARDS_URL, {
    version: '1',
    body: JSON.stringify({ tagIds }),
    signal: abortSignal,
  });
