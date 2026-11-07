/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../../../../common/lib/kibana';
import { extractAttackEntities, normalizeEntityKey } from '../entities/enrichment';

const ATTACK_DISCOVERY_FIND_URL = '/api/attack_discovery/_find';
const ATTACK_DISCOVERY_API_VERSION = '2023-10-31';
const MAX_ATTACKS = 500;

/** An Attack Discovery option for the "entities part of attack Y" filter. */
export interface AttackFilterOption {
  id: string;
  title: string;
  entityCount: number;
}

interface AttackDiscoveryApiItem {
  id: string;
  title?: string;
  entity_summary_markdown?: string;
  summary_markdown?: string;
  details_markdown?: string;
}

interface AttackDiscoveryFindApiResponse {
  data: AttackDiscoveryApiItem[];
  total: number;
}

/**
 * Fetches real Attack Discoveries and maps each to the entities it references.
 * Entity references are UUID-tokenized inside the AD markdown; requesting the
 * public find API with `enable_field_rendering=true` AND `with_replacements=true`
 * yields `{{ host.name SRVWIN01 }}` tokens with the real value inlined, which
 * {@link extractAttackEntities} parses. The result is a per-entity attack count
 * plus the set of attack ids for the filter.
 */
export const useEntityAttacks = (enabled = true) => {
  const { http } = useKibana().services;

  const { data, isLoading, isError } = useQuery(
    ['entityIntelligenceEntitiesAttacks'],
    ({ signal }) =>
      http.fetch<AttackDiscoveryFindApiResponse>(ATTACK_DISCOVERY_FIND_URL, {
        method: 'GET',
        version: ATTACK_DISCOVERY_API_VERSION,
        query: {
          enable_field_rendering: true,
          with_replacements: true,
          per_page: MAX_ATTACKS,
          page: 1,
        },
        signal,
      }),
    { enabled, retry: 1, refetchOnWindowFocus: false, keepPreviousData: true }
  );

  /** entityNameLower → set of attack discovery ids referencing it. */
  const attacksByEntity = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const discovery of data?.data ?? []) {
      const markdown = [
        discovery.entity_summary_markdown,
        discovery.details_markdown,
        discovery.summary_markdown,
      ]
        .filter((m): m is string => typeof m === 'string')
        .join('\n');
      for (const name of extractAttackEntities(markdown)) {
        const key = normalizeEntityKey(name);
        const set = map.get(key) ?? new Set<string>();
        set.add(discovery.id);
        map.set(key, set);
      }
    }
    return map;
  }, [data?.data]);

  /** Attack-filter options with per-attack distinct entity counts. */
  const attackOptions = useMemo<AttackFilterOption[]>(() => {
    const titleById = new Map<string, string>();
    const entityCountById = new Map<string, number>();
    for (const discovery of data?.data ?? []) {
      titleById.set(discovery.id, discovery.title ?? discovery.id);
    }
    for (const attackIds of attacksByEntity.values()) {
      for (const attackId of attackIds) {
        entityCountById.set(attackId, (entityCountById.get(attackId) ?? 0) + 1);
      }
    }
    return [...titleById.entries()]
      .map(([id, title]) => ({ id, title, entityCount: entityCountById.get(id) ?? 0 }))
      .sort((a, b) => b.entityCount - a.entityCount || a.title.localeCompare(b.title));
  }, [data?.data, attacksByEntity]);

  return { attacksByEntity, attackOptions, isLoading, isError };
};
