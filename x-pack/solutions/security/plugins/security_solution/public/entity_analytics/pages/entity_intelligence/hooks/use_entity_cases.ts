/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { entityEvidenceKey } from '../entities/evidence';
import { useKibana } from '../../../../common/lib/kibana';
import { fetchQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/api';

const CASES_FIND_URL = '/api/cases/_find';
const CASES_API_VERSION = '2023-10-31';
const MAX_CASES = 100;
const MAX_ALERT_IDS = 2000;

interface CaseSummary {
  id: string;
  title: string;
  totalAlerts: number;
}

interface CasesFindResponse {
  cases: Array<{ id: string; title: string; totalAlerts?: number }>;
  total: number;
}

interface CaseAlertRef {
  id: string;
  index: string;
  attached_at: string;
}

interface AlertEntityHit {
  _id: string;
  _index: string;
  fields?: {
    'user.name'?: string[];
    'host.name'?: string[];
    'service.name'?: string[];
  };
}

export interface EntityCaseInfo {
  /** Distinct case ids this entity appears in (via linked alerts). */
  caseIds: string[];
}

/** A case option for the "entities in case X" filter. */
export interface CaseFilterOption {
  id: string;
  title: string;
  entityCount: number;
}

/**
 * Builds a real entity → cases map by walking the Cases API: fetch all cases,
 * pull each case's linked alert ids, then resolve those alerts back to their
 * `user.name`/`host.name`/`service.name`. Alerts do not carry `case_ids` in
 * this deployment, so this Cases-side walk is the reliable linkage. Case
 * counts per entity and the case-filter options both derive from this map.
 */
export const useEntityCases = (enabled = true) => {
  const { http } = useKibana().services;

  const { data, isLoading, isError } = useQuery(
    ['entityIntelligenceEntitiesCases'],
    async ({ signal }) => {
      const found = await http.fetch<CasesFindResponse>(CASES_FIND_URL, {
        method: 'GET',
        query: { perPage: MAX_CASES, page: 1, sortField: 'createdAt', sortOrder: 'desc' },
        version: CASES_API_VERSION,
        signal,
      });
      const cases: CaseSummary[] = (found.cases ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        totalAlerts: c.totalAlerts ?? 0,
      }));

      // For each case with linked alerts, resolve alert ids → entity names.
      const caseIdToAlertIds = new Map<string, string[]>();
      let isPartial = found.total > cases.length;
      await Promise.all(
        cases.map(async (c) => {
          if (c.totalAlerts === 0) {
            caseIdToAlertIds.set(c.id, []);
            return;
          }
          try {
            const refs = await http.fetch<CaseAlertRef[]>(
              `/api/cases/${encodeURIComponent(c.id)}/alerts`,
              { method: 'GET', version: CASES_API_VERSION, signal }
            );
            caseIdToAlertIds.set(
              c.id,
              refs.map((r) => r.id)
            );
          } catch (err) {
            isPartial = true;
            caseIdToAlertIds.set(c.id, []);
          }
        })
      );

      const linkedAlertIds = [...new Set([...caseIdToAlertIds.values()].flat())];
      const allAlertIds = linkedAlertIds.slice(0, MAX_ALERT_IDS);
      isPartial = isPartial || linkedAlertIds.length > MAX_ALERT_IDS;

      // Resolve the linked alert ids to their entity names in one query.
      const alertIdToEntities = new Map<string, string[]>();
      if (allAlertIds.length > 0) {
        const response = await fetchQueryAlerts<AlertEntityHit, never>({
          query: {
            size: allAlertIds.length,
            _source: false,
            fields: ['user.name', 'host.name', 'service.name'],
            query: { ids: { values: allAlertIds } },
          },
          signal: signal ?? new AbortController().signal,
        });
        for (const hit of response.hits.hits) {
          const names = [
            ...(hit.fields?.['user.name'] ?? []).map((name) => entityEvidenceKey('user', name)),
            ...(hit.fields?.['host.name'] ?? []).map((name) => entityEvidenceKey('host', name)),
            ...(hit.fields?.['service.name'] ?? []).map((name) =>
              entityEvidenceKey('service', name)
            ),
          ];
          if (alertIdToEntities.has(hit._id)) isPartial = true;
          alertIdToEntities.set(hit._id, [...new Set(names)]);
        }
        isPartial = isPartial || allAlertIds.some((id) => !alertIdToEntities.has(id));
      }

      return { cases, caseIdToAlertIds, alertIdToEntities, isPartial };
    },
    { enabled, retry: 1, refetchOnWindowFocus: false, keepPreviousData: true }
  );

  /** entityNameLower → distinct case ids. */
  const casesByEntity = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!data) return map;
    for (const [caseId, alertIds] of data.caseIdToAlertIds.entries()) {
      for (const alertId of alertIds) {
        for (const entityName of data.alertIdToEntities.get(alertId) ?? []) {
          const set = map.get(entityName) ?? new Set<string>();
          set.add(caseId);
          map.set(entityName, set);
        }
      }
    }
    return map;
  }, [data]);

  /** Case-filter options with per-case distinct entity counts. */
  const caseOptions = useMemo<CaseFilterOption[]>(() => {
    if (!data) return [];
    const entityCountByCase = new Map<string, number>();
    for (const caseIds of casesByEntity.values()) {
      for (const caseId of caseIds) {
        entityCountByCase.set(caseId, (entityCountByCase.get(caseId) ?? 0) + 1);
      }
    }
    return data.cases
      .map((c) => ({ id: c.id, title: c.title, entityCount: entityCountByCase.get(c.id) ?? 0 }))
      .sort((a, b) => b.entityCount - a.entityCount || a.title.localeCompare(b.title));
  }, [data, casesByEntity]);

  return { casesByEntity, caseOptions, isLoading, isError, isPartial: data?.isPartial ?? false };
};
