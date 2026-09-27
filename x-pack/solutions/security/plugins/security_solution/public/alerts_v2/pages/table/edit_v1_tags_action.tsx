/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { noop } from 'lodash';
import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ALERT_WORKFLOW_TAGS } from '@kbn/rule-data-utils';
import type { TimelineItem } from '@kbn/timelines-plugin/common';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import { BulkAlertTagsPanel } from '../../../common/components/toolbar/bulk_actions/alert_bulk_tags';
import { useSetAlertTags } from '../../../common/components/toolbar/bulk_actions/use_set_alert_tags';
import type { EpisodeActionPanelContext, EpisodeMenuAction } from './episode_actions_menu';

export const EDIT_V1_TAGS_ACTION_ID = 'SECURITY_V1_EDIT_TAGS';

const EDIT_TAGS_LABEL = i18n.translate(
  'xpack.securitySolution.alertsV2.episodesTable.editV1Tags',
  { defaultMessage: 'Edit tags' }
);

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String) : value != null ? [String(value)] : [];

/** A union-view row originates from a v1 detection alert (vs a native v2 episode). */
const isClassicAlert = (episode: AlertEpisode): boolean =>
  (episode as unknown as Record<string, unknown>).source_kind === 'v1';

interface V1TagsPanelProps {
  /** The v1 alert document id (`kibana.alert.uuid`), which the tags API is keyed by. */
  alertId: string;
  /** Currently applied workflow tags, so the picker can pre-select and compute add/remove. */
  currentTags: string[];
  onSuccess: () => void;
  closeMenu: () => void;
}

/**
 * Security's native alert tags editor, applying via the detection-engine tags API rather than the v2
 * `.alert-actions` store. Rendered as a nested menu panel so it stays inside the app's React tree
 * (where the Kibana context `BulkAlertTagsPanel` needs is available). `BulkAlertTagsPanel` reads the
 * current tags off a minimal `TimelineItem` and posts add/remove itself.
 */
const V1TagsPanel = memo(({ alertId, currentTags, onSuccess, closeMenu }: V1TagsPanelProps) => {
  const setAlertTags = useSetAlertTags();

  const alertItems = useMemo<TimelineItem[]>(
    () =>
      [
        {
          _id: alertId,
          data: [{ field: ALERT_WORKFLOW_TAGS, value: currentTags }],
          ecs: { _id: alertId },
        },
      ] as unknown as TimelineItem[],
    [alertId, currentTags]
  );

  if (!setAlertTags) {
    return null;
  }

  return (
    <BulkAlertTagsPanel
      alertItems={alertItems}
      setIsLoading={noop}
      closePopoverMenu={closeMenu}
      onSubmit={setAlertTags}
      refetchQuery={onSuccess}
    />
  );
});
V1TagsPanel.displayName = 'V1TagsPanel';

/**
 * Row action that edits tags on a v1 (classic) alert. The v2 tags action is hidden on these rows
 * (gated out in the table section), so this stands in for it. Only shown for v1 rows; v2 episodes
 * keep the RnA tags action.
 */
export const createEditV1TagsAction = (): EpisodeMenuAction => ({
  id: EDIT_V1_TAGS_ACTION_ID,
  order: 40,
  displayName: EDIT_TAGS_LABEL,
  iconType: 'tag',
  isCompatible: ({ episodes }) => episodes.length > 0 && episodes.every(isClassicAlert),
  // Handled entirely through the nested picker panel below.
  execute: async () => {},
  renderPanel: ({ episodes, onSuccess, closeMenu }: EpisodeActionPanelContext) => {
    const row = episodes[0] as unknown as Record<string, unknown>;
    const alertId = String(row['episode.id'] ?? row['kibana.alert.uuid'] ?? '');
    const currentTags = asStringArray(row['kibana.alert.workflow_tags']);
    return (
      <V1TagsPanel
        alertId={alertId}
        currentTags={currentTags}
        onSuccess={onSuccess}
        closeMenu={closeMenu}
      />
    );
  },
});
