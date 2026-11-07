/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import { useQuery } from '@kbn/react-query';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import { i18n } from '@kbn/i18n';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { useKibana } from '../../../../common/lib/kibana';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { buildHostCriticalitySearch, readHostCriticality } from '../attack_path_criticality';
import type { HostCriticalityResponse } from '../attack_path_criticality';
import type { IntelligenceEntity } from '../common';
import type { TimeRangePreset } from '../graph_state';
import { activityPhrase } from '../event_context';
import { useEntityRelationships } from './use_entity_relationships';
import type { AlertSeverity, RelatedEntity } from './use_entity_relationships';
import { useEntityTimeline } from './use_entity_timeline';
import { buildAttackPath, KILL_CHAIN_ORDER } from '../attack_path_model';
import type { AttackPath, AttackPathNeighbor, KillChainStage } from '../attack_path_model';

const STAGE_LABEL_KEYS: Record<KillChainStage, { id: string; defaultMessage: string }> = {
  'initial-access': {
    id: 'xpack.securitySolution.entityAnalytics.intelligence.explorer.stageInitialAccess',
    defaultMessage: 'Initial Access',
  },
  execution: {
    id: 'xpack.securitySolution.entityAnalytics.intelligence.explorer.stageExecution',
    defaultMessage: 'Execution',
  },
  persistence: {
    id: 'xpack.securitySolution.entityAnalytics.intelligence.explorer.stagePersistence',
    defaultMessage: 'Persistence',
  },
  'privilege-escalation': {
    id: 'xpack.securitySolution.entityAnalytics.intelligence.explorer.stagePrivEsc',
    defaultMessage: 'Privilege Escalation',
  },
  'defense-evasion': {
    id: 'xpack.securitySolution.entityAnalytics.intelligence.explorer.stageDefenseEvasion',
    defaultMessage: 'Defense Evasion',
  },
  'credential-access': {
    id: 'xpack.securitySolution.entityAnalytics.intelligence.explorer.stageCredentialAccess',
    defaultMessage: 'Credential Access',
  },
  discovery: {
    id: 'xpack.securitySolution.entityAnalytics.intelligence.explorer.stageDiscovery',
    defaultMessage: 'Discovery',
  },
  'lateral-movement': {
    id: 'xpack.securitySolution.entityAnalytics.intelligence.explorer.stageLateralMovement',
    defaultMessage: 'Lateral Movement',
  },
  collection: {
    id: 'xpack.securitySolution.entityAnalytics.intelligence.explorer.stageCollection',
    defaultMessage: 'Collection',
  },
  'command-and-control': {
    id: 'xpack.securitySolution.entityAnalytics.intelligence.explorer.stageC2',
    defaultMessage: 'Command & Control',
  },
  exfiltration: {
    id: 'xpack.securitySolution.entityAnalytics.intelligence.explorer.stageExfiltration',
    defaultMessage: 'Exfiltration',
  },
  impact: {
    id: 'xpack.securitySolution.entityAnalytics.intelligence.explorer.stageImpact',
    defaultMessage: 'Impact',
  },
};

const buildStageLabels = (): Record<KillChainStage, string> =>
  Object.fromEntries(
    KILL_CHAIN_ORDER.map((stage) => [
      stage,
      i18n.translate(STAGE_LABEL_KEYS[stage].id, STAGE_LABEL_KEYS[stage]),
    ])
  ) as Record<KillChainStage, string>;

/** Pulls the dominant activity phrase + first routable-looking destination. */
const neighborActivity = (
  related: RelatedEntity
): { activity: string | undefined; destinationIp: string | undefined } => {
  const { dominant, activities } = related.context;
  const network = activities.find((activity) => activity.kind === 'network');
  const destinationIp = network?.detail?.split(':')[0];
  return {
    activity: dominant ? activityPhrase(dominant) : undefined,
    destinationIp,
  };
};

/** RFC1918 / loopback / link-local prefixes — treated as non-external. */
const isPublicIp = (ip: string): boolean => {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
  const [a, b] = ip.split('.').map((part) => Number(part));
  if (a === 10 || a === 127) return false;
  if (a === 192 && b === 168) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 169 && b === 254) return false;
  if (a === 0) return false;
  return true;
};

interface SourceIpAggResponse {
  aggregations?: { srcIps?: { buckets?: Array<{ key: string; doc_count: number }> } };
}

export interface UseAttackPathParams {
  entity: IntelligenceEntity | undefined;
  timeRange: TimeRangePreset;
  severities?: readonly AlertSeverity[];
  enabled?: boolean;
}

export interface UseAttackPathResult {
  path: AttackPath | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const ALL_SEVERITIES: readonly AlertSeverity[] = ['low', 'medium', 'high', 'critical'];
const ALL_KINDS = [EntityType.user, EntityType.host, EntityType.service, 'ip'] as const;

/**
 * Composes the attack-path storyline for a focus entity by reusing the existing
 * data hooks — relationships (`.alerts-security.*` + `logs-*` event context)
 * and the significance timeline — plus a bounded entity-store lookup for asset
 * criticality (crown-jewel grounding). Feeds them to the pure
 * {@link buildAttackPath}. Resilient: any missing piece degrades to a sparser
 * (or minimal) path rather than erroring.
 */
export const useAttackPath = ({
  entity,
  timeRange,
  severities = ALL_SEVERITIES,
  enabled = true,
}: UseAttackPathParams): UseAttackPathResult => {
  const search = useKibana().services.data.search.search;
  const spaceId = useSpaceId();
  const isQueryable = enabled && !!entity && entity.type !== EntityType.generic;

  const relationshipParams = useMemo(
    () => ({ timeRange, entityTypes: ALL_KINDS, severities, sizeLimit: 8 }),
    [severities, timeRange]
  );
  const {
    relationships,
    isLoading: isRelLoading,
    isError: isRelError,
    refetch: refetchRel,
  } = useEntityRelationships(entity, relationshipParams);

  const {
    model: timelineModel,
    isLoading: isTimelineLoading,
    refetch: refetchTimeline,
  } = useEntityTimeline({ entity, timeRange, enabled: isQueryable });

  // Bounded asset-criticality lookup for the spine host names. Best-effort:
  // resolves to an empty map (never throws) so crown jewels degrade to the
  // data-store/exfil heuristics when the entity store is unavailable.
  const hostNames = useMemo(() => {
    const names = new Set<string>();
    if (entity?.type === EntityType.host) names.add(entity.identifierValue);
    for (const related of relationships?.related ?? []) {
      if (related.kind === EntityType.host) names.add(related.name);
    }
    return [...names].slice(0, 12);
  }, [entity, relationships]);

  const { data: criticalityByName } = useQuery(
    ['entityIntelligenceAttackPathCriticality', spaceId, hostNames],
    async ({ signal }) => {
      const result = new Map<string, string>();
      if (!spaceId || hostNames.length === 0) return result;
      try {
        const response = await lastValueFrom(
          search<
            { params: ReturnType<typeof buildHostCriticalitySearch> },
            IKibanaSearchResponse<HostCriticalityResponse>
          >(
            { params: buildHostCriticalitySearch(spaceId, hostNames) },
            { abortSignal: signal ?? undefined }
          )
        );
        return readHostCriticality(response.rawResponse);
      } catch {
        // Entity store unavailable — leave the map empty.
      }
      return result;
    },
    {
      enabled: isQueryable && !!spaceId && hostNames.length > 0,
      retry: 0,
      refetchOnWindowFocus: false,
    }
  );

  // Grounded external-entry lookup: does a real public inbound `source.ip`
  // reach the focus? Only then do we prepend an Internet/external origin node.
  // Best-effort — resolves to undefined (no origin) when nothing matches or the
  // query fails, so we never synthesize an external origin.
  const focusField =
    entity?.type === EntityType.user
      ? 'user.name'
      : entity?.type === EntityType.host
      ? 'host.name'
      : undefined;
  const { data: externalEntry } = useQuery(
    ['entityIntelligenceAttackPathExternalEntry', focusField, entity?.identifierValue, timeRange],
    async ({ signal }) => {
      if (!focusField || !entity) return undefined;
      try {
        const response = await lastValueFrom(
          search<{ params: Record<string, unknown> }, IKibanaSearchResponse<SourceIpAggResponse>>(
            {
              params: {
                index: 'logs-*',
                allow_no_indices: true,
                ignore_unavailable: true,
                size: 0,
                query: {
                  bool: {
                    filter: [
                      { term: { [focusField]: entity.identifierValue } },
                      { exists: { field: 'source.ip' } },
                      { range: { '@timestamp': { gte: `now-${timeRange}`, lte: 'now' } } },
                    ],
                    should: [
                      { term: { 'network.direction': 'inbound' } },
                      { term: { 'network.direction': 'ingress' } },
                    ],
                    minimum_should_match: 1,
                  },
                },
                aggs: { srcIps: { terms: { field: 'source.ip', size: 20 } } },
              },
            },
            { abortSignal: signal ?? undefined }
          )
        );
        const buckets = response.rawResponse?.aggregations?.srcIps?.buckets ?? [];
        const publicBucket = buckets.find((bucket) => isPublicIp(bucket.key));
        return publicBucket
          ? { sourceIp: publicBucket.key, count: publicBucket.doc_count }
          : undefined;
      } catch {
        return undefined;
      }
    },
    { enabled: isQueryable && !!focusField, retry: 0, refetchOnWindowFocus: false }
  );

  const path = useMemo<AttackPath | undefined>(() => {
    if (!isQueryable || !entity) return undefined;
    const critMap = criticalityByName ?? new Map<string, string>();
    const neighbors: AttackPathNeighbor[] = (relationships?.related ?? []).map((related) => {
      const { activity, destinationIp } = neighborActivity(related);
      return {
        id: related.id,
        name: related.name,
        kind: related.kind,
        alertCount: related.alertCount,
        worstSeverity: related.worstSeverity,
        activity,
        criticality: related.kind === EntityType.host ? critMap.get(related.name) : undefined,
        destinationIp,
      };
    });
    return buildAttackPath({
      focus: {
        name: entity.name,
        kind:
          entity.type === EntityType.user
            ? EntityType.user
            : entity.type === EntityType.host
            ? EntityType.host
            : EntityType.service,
        identifierValue: entity.identifierValue,
        worstSeverity: relationships?.related.reduce<AlertSeverity | undefined>(
          (worst, related) => related.worstSeverity ?? worst,
          undefined
        ),
        alertCount: relationships?.totalAlerts ?? 0,
        criticality: entity.criticality,
      },
      neighbors,
      steps: timelineModel.steps,
      stageLabels: buildStageLabels(),
      originLabel: i18n.translate(
        'xpack.securitySolution.entityAnalytics.intelligence.explorer.attackPathOrigin',
        { defaultMessage: 'Internet' }
      ),
      externalEntry: externalEntry ?? undefined,
    });
  }, [criticalityByName, entity, externalEntry, isQueryable, relationships, timelineModel.steps]);

  return {
    path,
    isLoading: isRelLoading || isTimelineLoading,
    isError: isRelError,
    refetch: () => {
      refetchRel();
      refetchTimeline();
    },
  };
};
