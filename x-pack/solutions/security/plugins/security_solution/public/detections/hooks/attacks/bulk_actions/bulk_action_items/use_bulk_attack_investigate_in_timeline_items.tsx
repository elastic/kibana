/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { BulkActionsConfig } from '@kbn/response-ops-alerts-table/types';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useInvestigateInTimeline } from '../../../../../common/hooks/timeline/use_investigate_in_timeline';
import { buildAlertsKqlFilter } from '../../../../components/alerts_table/actions';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../components/alerts_table/translations';
import type { BulkAttackActionItems } from '../types';
import { extractRelatedDetectionAlertIds } from '../utils/extract_related_detection_alert_ids';

export interface UseBulkAttackInvestigateInTimelineItemsProps {
  /** Optional callback to close the popover after triggering action */
  closePopover?: () => void;
}

/**
 * Hook that provides bulk action items for investigating attacks in Timeline.
 */
export const useBulkAttackInvestigateInTimelineItems = ({
  closePopover,
}: UseBulkAttackInvestigateInTimelineItemsProps = {}): BulkAttackActionItems => {
  const { investigateInTimeline } = useInvestigateInTimeline();
  const {
    timelinePrivileges: { read: canUseTimeline },
  } = useUserPrivileges();

  const onInvestigateInTimelineClick = useCallback<Required<BulkActionsConfig>['onClick']>(
    async (alertItems) => {
      const alertIds = extractRelatedDetectionAlertIds(alertItems);
      const alertIdFilters = buildAlertsKqlFilter('_id', alertIds);

      investigateInTimeline({
        filters: alertIdFilters,
      });
      closePopover?.();
    },
    [closePopover, investigateInTimeline]
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
