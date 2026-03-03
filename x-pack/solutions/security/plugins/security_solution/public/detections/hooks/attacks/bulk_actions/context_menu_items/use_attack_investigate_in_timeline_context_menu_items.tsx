/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import type { EuiContextMenuPanelItemDescriptorEntry } from '@elastic/eui/src/components/context_menu/context_menu';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { useInvestigateInTimeline } from '../../../../../common/hooks/timeline/use_investigate_in_timeline';
import { buildAlertsKqlFilter } from '../../../../components/alerts_table/actions';
import { ACTION_INVESTIGATE_IN_TIMELINE } from '../../../../components/alerts_table/translations';

export interface UseAttackInvestigateInTimelineContextMenuItemsProps {
  /**
   *  The attack discovery object
   */
  attack: AttackDiscoveryAlert;
  /**
   * Optional callback to close the containing popover menu
   */
  closePopover?: () => void;
}

export const useAttackInvestigateInTimelineContextMenuItems = ({
  attack,
  closePopover,
}: UseAttackInvestigateInTimelineContextMenuItemsProps): {
  items: EuiContextMenuPanelItemDescriptorEntry[];
} => {
  const { investigateInTimeline } = useInvestigateInTimeline();
  const {
    timelinePrivileges: { read: canUseTimeline },
  } = useUserPrivileges();

  const originalAlertIds = useMemo(
    () => attack.alertIds.map((id) => attack.replacements?.[id] ?? id),
    [attack.alertIds, attack.replacements]
  );

  const attackAlertIdFilters = useMemo(
    () => buildAlertsKqlFilter('_id', originalAlertIds),
    [originalAlertIds]
  );

  const onInvestigateInTimelineClick = useCallback(() => {
    investigateInTimeline({
      filters: attackAlertIdFilters,
    });
    closePopover?.();
  }, [attackAlertIdFilters, closePopover, investigateInTimeline]);

  const items = useMemo<EuiContextMenuPanelItemDescriptorEntry[]>(
    () =>
      canUseTimeline
        ? [
            {
              name: ACTION_INVESTIGATE_IN_TIMELINE,
              key: 'attack-investigate-in-timeline-action-item',
              'data-test-subj': 'attack-investigate-in-timeline-action-item',
              onClick: onInvestigateInTimelineClick,
            },
          ]
        : [],
    [canUseTimeline, onInvestigateInTimelineClick]
  );

  return { items };
};
