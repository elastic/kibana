/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MitreEntity, MitreFramework } from '@kbn/security-mitre-attack-common';
import { KibanaServices } from '../../../../../common/lib/kibana';

const API_BASE = '/internal/mitre';
const API_VERSION = '1';

const fetchEntities = async <T extends { entities: MitreEntity[] }>(
  path: string,
  query: Record<string, string | string[] | number | undefined>,
  signal?: AbortSignal
): Promise<MitreEntity[]> => {
  const filteredQuery = Object.fromEntries(
    Object.entries(query).filter(([, v]) => v != null)
  ) as Record<string, string | string[] | number>;

  const response = await KibanaServices.get().http.fetch<T>(path, {
    method: 'GET',
    version: API_VERSION,
    query: filteredQuery,
    signal,
  });
  return response.entities;
};

export const fetchTactics = (framework: MitreFramework, signal?: AbortSignal) =>
  fetchEntities(`${API_BASE}/tactics`, { framework }, signal);

export const fetchTechniques = (framework: MitreFramework, signal?: AbortSignal) =>
  fetchEntities(`${API_BASE}/techniques`, { framework }, signal);

export const fetchSubtechniques = (framework: MitreFramework, signal?: AbortSignal) =>
  fetchEntities(`${API_BASE}/subtechniques`, { framework }, signal);
