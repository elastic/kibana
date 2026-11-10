/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { useKibana } from '../../../../common/lib/kibana';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useInvestigateInTimeline } from '../../../../common/hooks/timeline/use_investigate_in_timeline';
import { buildAlertsKqlFilter } from '../../../../detections/components/alerts_table/actions';
import { AttacksEventTypes } from '../../../../common/lib/telemetry';
import { getAttacksTimeRange } from '../../../../detections/hooks/attacks/bulk_actions/utils/get_attacks_time_range';
import { getAttackAlertIds } from '../utils';

export interface UseInvestigateAttackInTimelineResult {
  /** False when the user cannot read timelines, in which case the action is not offered at all. */
  canInvestigateInTimeline: boolean;
  /** Opens Timeline scoped to the attack's constituent alerts. A no-op for an unresolved attack. */
  investigateAttackInTimeline: (attack: AttackDiscoveryAlert | undefined) => void;
}

/**
 * Opens Timeline filtered to an attack's constituent alerts. Call once per grid, not per row, as
 * `useInvestigateInTimeline` resolves data views and timeline state.
 */
export const useInvestigateAttackInTimeline = (): UseInvestigateAttackInTimelineResult => {
  const { telemetry } = useKibana().services;
  const { investigateInTimeline } = useInvestigateInTimeline();
  const {
    timelinePrivileges: { read: canInvestigateInTimeline },
  } = useUserPrivileges();

  const investigateAttackInTimeline = useCallback(
    (attack: AttackDiscoveryAlert | undefined) => {
      const alertIds = getAttackAlertIds(attack);

      if (alertIds.length === 0) {
        return;
      }

      telemetry.reportEvent(AttacksEventTypes.TimelineInvestigationOpened, {
        source: 'case_attachment_table',
      });

      investigateInTimeline({
        filters: buildAlertsKqlFilter('_id', alertIds),
        timeRange: getAttacksTimeRange([attack?.timestamp]),
      });
    },
    [investigateInTimeline, telemetry]
  );

  return { canInvestigateInTimeline, investigateAttackInTimeline };
};
