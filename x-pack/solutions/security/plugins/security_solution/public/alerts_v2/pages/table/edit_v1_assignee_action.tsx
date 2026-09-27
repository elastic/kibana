/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import React, { memo, useCallback } from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import type { AlertAssignees } from '../../../../common/api/detection_engine';
import { AssigneesApplyPanel } from '../../../common/components/assignees/assignees_apply_panel';
import { useSetAlertAssignees } from '../../../common/components/toolbar/bulk_actions/use_set_alert_assignees';
import type { EpisodeActionPanelContext, EpisodeMenuAction } from './episode_actions_menu';

export const EDIT_V1_ASSIGNEE_ACTION_ID = 'SECURITY_V1_EDIT_ASSIGNEE';

const EDIT_ASSIGNEE_LABEL = i18n.translate(
  'xpack.securitySolution.alertsV2.episodesTable.editV1Assignee',
  { defaultMessage: 'Edit assignees' }
);

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : value != null ? [String(value)] : [];

/** A union-view row originates from a v1 detection alert (vs a native v2 episode). */
const isClassicAlert = (episode: AlertEpisode): boolean =>
  (episode as unknown as Record<string, unknown>).source_kind === 'v1';

interface V1AssigneePanelProps {
  /** The v1 alert document id (`kibana.alert.uuid`), which the assignees API is keyed by. */
  alertId: string;
  /** Currently assigned user ids, so the picker can pre-select and compute add/remove. */
  assignedUserIds: string[];
  onSuccess: () => void;
  closeMenu: () => void;
}

/**
 * Security's native (multi-)assignee picker, applying via the detection-engine assignees API rather
 * than the v2 `.alert-actions` store. Rendered as a nested menu panel so it lives inside the app's
 * React tree, where the Kibana + react-query context the picker needs is already available.
 */
const V1AssigneePanel = memo(
  ({ alertId, assignedUserIds, onSuccess, closeMenu }: V1AssigneePanelProps) => {
    const setAlertAssignees = useSetAlertAssignees();
    const searchInputId = useGeneratedHtmlId({ prefix: 'v1AssigneeSearch' });

    const onApply = useCallback(
      (assignees: AlertAssignees) => {
        closeMenu();
        if (!setAlertAssignees || !alertId) {
          return;
        }
        void setAlertAssignees(assignees, [alertId], onSuccess, noop);
      },
      [setAlertAssignees, alertId, onSuccess, closeMenu]
    );

    return (
      <AssigneesApplyPanel
        searchInputId={searchInputId}
        assignedUserIds={assignedUserIds}
        onApply={onApply}
      />
    );
  }
);
V1AssigneePanel.displayName = 'V1AssigneePanel';

/**
 * Row action that edits assignees on a v1 (classic) alert. The v2 assignee action is hidden on these
 * rows (they carry `supports_actions: false` from the unified view), so this stands in for them.
 * Only shown for v1 rows; v2 episodes keep the RnA assignee action.
 */
export const createEditV1AssigneeAction = (): EpisodeMenuAction => ({
  id: EDIT_V1_ASSIGNEE_ACTION_ID,
  order: 50,
  displayName: EDIT_ASSIGNEE_LABEL,
  iconType: 'user',
  isCompatible: ({ episodes }) => episodes.length > 0 && episodes.every(isClassicAlert),
  // Handled entirely through the nested picker panel below.
  execute: async () => {},
  renderPanel: ({ episodes, onSuccess, closeMenu }: EpisodeActionPanelContext) => {
    const row = episodes[0] as unknown as Record<string, unknown>;
    const alertId = String(row['episode.id'] ?? row['kibana.alert.uuid'] ?? '');
    const assignedUserIds = asStringArray(row['kibana.alert.workflow_assignee_ids']);
    return (
      <V1AssigneePanel
        alertId={alertId}
        assignedUserIds={assignedUserIds}
        onSuccess={onSuccess}
        closeMenu={closeMenu}
      />
    );
  },
});
