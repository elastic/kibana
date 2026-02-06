/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { isArray } from 'lodash/fp';
import type { RawBucket } from '@kbn/grouping/src';
import { useAssistantContext } from '@kbn/elastic-assistant';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';

import { ALERT_ATTACK_IDS } from '../../../../common/field_maps/field_names';
import { useFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import type { AlertsGroupingAggregation } from '../../components/alerts_table/grouping_settings/types';

const EMPTY_RECORD: Record<string, AttackDiscoveryAlert> = {};

export type AttackForGroup = (
  selectedGroup: string,
  bucket: RawBucket<AlertsGroupingAggregation>
) => AttackDiscoveryAlert | undefined;

/**
 * Props for the useAttackGroupHandler hook
 */
export interface UseAttackGroupHandlerProps {
  /** Optional array of attack IDs to pre-fetch and cache for rendering */
  attackIds?: string[];
}

/**
 * Return type for the useAttackGroupHandler hook
 */
export interface UseAttackGroupHandlerReturn {
  /** Indicates if the attack data is currently loading */
  isLoading: boolean;
  /** Helper function to retrieve attack details for a specific grouping bucket */
  getAttack: AttackForGroup;
}

/**
 * Hook to fetch and manage attack discovery details for a group of alerts.
 * It provides a helper to look up attack details by ID when grouping alerts by attack.
 */
export const useAttackGroupHandler = ({
  attackIds,
}: UseAttackGroupHandlerProps): UseAttackGroupHandlerReturn => {
  const { assistantAvailability, http } = useAssistantContext();

  const { data: attacksData, isLoading } = useFindAttackDiscoveries({
    ids: attackIds,
    http,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    perPage: Math.max(attackIds?.length ?? 1, 1),
  });

  const attacksRecord = useMemo(() => {
    if (isLoading || !attacksData?.data.length) {
      return EMPTY_RECORD;
    }
    return attacksData.data.reduce<Record<string, AttackDiscoveryAlert>>((acc, attack) => {
      acc[attack.id] = attack;
      return acc;
    }, {});
  }, [attacksData?.data, isLoading]);

  const getAttack = useCallback<AttackForGroup>(
    (selectedGroup, bucket) => {
      if (selectedGroup !== ALERT_ATTACK_IDS) {
        return;
      }
      if (isArray(bucket.key) && bucket.key.length !== 1) {
        return undefined;
      }
      const attackId = isArray(bucket.key) ? bucket.key[0] : bucket.key;
      return attacksRecord[attackId];
    },
    [attacksRecord]
  );

  return { isLoading, getAttack };
};
