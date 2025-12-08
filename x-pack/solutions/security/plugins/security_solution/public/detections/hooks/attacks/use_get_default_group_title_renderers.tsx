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

import { ALERT_ATTACK_IDS } from '../../../../common/field_maps/field_names';
import { useFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import type { AlertsGroupingAggregation } from '../../components/alerts_table/grouping_settings/types';
import { AttackGroupContent } from '../../components/attacks/table/attack_group_content';

export interface UseGetDefaultGroupTitleRenderersProps {
  attackIds?: string[];
}

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
      return [];
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
