/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { isArray } from 'lodash/fp';
import type { GroupPanelRenderer } from '@kbn/grouping/src';
import { useAssistantContext } from '@kbn/elastic-assistant';

import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { ALERT_ATTACK_IDS } from '../../../../common/field_maps/field_names';
import { useFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import type { AlertsGroupingAggregation } from '../../components/alerts_table/grouping_settings/types';
import { AttackGroupContent } from '../../components/attacks/table/attack_group_content';

const EMPTY_ARRAY: AttackDiscoveryAlert[] = [];

/**
 * Props for the useGetDefaultGroupTitleRenderers hook
 */
export interface UseGetDefaultGroupTitleRenderersProps {
  /** Optional array of attack IDs to pre-fetch and cache for rendering */
  attackIds?: string[];
}

/**
 * Pre-caches attack discovery documents using the provided attack IDs and returns
 * a renderer function that uses these cached documents for individual group component rendering.
 * This hook optimizes performance by fetching all required attack data upfront rather than
 * on-demand during rendering.
 *
 * @param props - The hook props
 * @param props.attackIds - Optional array of attack IDs to pre-fetch and cache
 * @returns An object containing the defaultGroupTitleRenderers function for rendering group titles
 */
export const useGetDefaultGroupTitleRenderers = ({
  attackIds,
}: UseGetDefaultGroupTitleRenderersProps) => {
  const { assistantAvailability, http } = useAssistantContext();

  const { data: attacksData, isLoading: isLoadingAttacks } = useFindAttackDiscoveries({
    ids: attackIds,
    http,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    perPage: Math.max(attackIds?.length ?? 1, 1),
  });

  const attacks = useMemo(() => {
    if (isLoadingAttacks || !attacksData?.data.length) {
      return EMPTY_ARRAY;
    }
    return attacksData.data;
  }, [attacksData?.data, isLoadingAttacks]);

  const defaultGroupTitleRenderers: GroupPanelRenderer<AlertsGroupingAggregation> = useCallback(
    (selectedGroup, bucket) => {
      switch (selectedGroup) {
        case ALERT_ATTACK_IDS: {
          if (isArray(bucket.key) && bucket.key.length !== 1) {
            return undefined;
          }
          const attackId = isArray(bucket.key) ? bucket.key[0] : bucket.key;
          const attack = attacks.find(({ id }) => id === attackId);
          if (!attack) {
            return undefined;
          }
          return <AttackGroupContent attack={attack} dataTestSubj="attack" />;
        }
      }
    },
    [attacks]
  );

  return { defaultGroupTitleRenderers };
};
