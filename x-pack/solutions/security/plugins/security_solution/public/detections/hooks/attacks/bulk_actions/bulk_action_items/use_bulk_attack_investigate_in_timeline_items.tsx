/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { BulkActionsConfig } from '@kbn/response-ops-alerts-table/types';
import { uniq } from 'lodash';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useInvestigateInTimeline } from '../../../../../common/hooks/timeline/use_investigate_in_timeline';
import { buildAlertsKqlFilter } from '../../../../components/alerts_table/actions';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../components/alerts_table/translations';
import { ALERT_ATTACK_DISCOVERY_ALERT_IDS } from '../constants';
import type { BulkAttackActionItems } from '../types';

/**
 * Hook that provides bulk action items for investigating attacks in Timeline.
 */
export const useBulkAttackInvestigateInTimelineItems = (): BulkAttackActionItems => {
  const { investigateInTimeline } = useInvestigateInTimeline();
  const {
    timelinePrivileges: { read: canUseTimeline },
  } = useUserPrivileges();

  const onInvestigateInTimelineClick = useCallback<Required<BulkActionsConfig>['onClick']>(
    async (alertItems) => {
      const alertIds = uniq(
        alertItems.flatMap((item) => {
          const value = item.data.find(
            (data) => data.field === ALERT_ATTACK_DISCOVERY_ALERT_IDS
          )?.value;
          return Array.isArray(value)
            ? value.filter((id): id is string => typeof id === 'string')
            : [];
        })
      );
      const alertIdFilters = buildAlertsKqlFilter('_id', alertIds);

      investigateInTimeline({
        filters: alertIdFilters,
      });
    },
    [investigateInTimeline]
  );

  const items = useMemo<BulkActionsConfig[]>(
    () =>
      canUseTimeline
        ? [
            {
              name: ACTION_INVESTIGATE_IN_TIMELINE,
              label: ACTION_INVESTIGATE_IN_TIMELINE,
              key: 'attack-investigate-in-timeline-action-item',
              'data-test-subj': 'attack-investigate-in-timeline-action-item',
              disableOnQuery: true,
              onClick: onInvestigateInTimelineClick,
            },
          ]
        : [],
    [canUseTimeline, onInvestigateInTimelineClick]
  );

  return useMemo(
    () => ({
      items,
      panels: [],
    }),
    [items]
  );
};
