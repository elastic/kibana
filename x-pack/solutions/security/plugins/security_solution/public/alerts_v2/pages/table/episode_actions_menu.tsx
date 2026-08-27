/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord, RowControlComponent } from '@kbn/discover-utils';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';

const MORE_ACTIONS_LABEL = i18n.translate(
  'xpack.securitySolution.alertsV2.episodesTable.moreActions',
  { defaultMessage: 'More actions' }
);

export interface EpisodeActionsMenuProps {
  /** The grid's row-control button component, used as the popover anchor. */
  Control: RowControlComponent;
  /** The episode row; its `flattened` is the `AlertEpisode` the action factories consume. */
  record: DataTableRecord;
  /** The mutation actions (status ack/unack/resolve/unresolve, tags, …), already built with deps. */
  actions: EpisodeAction[];
  /** Called after an action succeeds, to refresh the table (the view is eventually consistent). */
  onSuccess: () => void;
}

/**
 * Row "…" menu that lists the mutation actions compatible with the given episode — mirroring the
 * v1 alerts table's per-row "take action" menu. Each item is an RnA `EpisodeAction`: `isCompatible`
 * decides which apply to the episode's current state, and `execute` posts the change to
 * `.alert-actions` (or opens its own editor, e.g. the tags flyout) and toasts.
 */
export const EpisodeActionsMenu = ({
  Control,
  record,
  actions,
  onSuccess,
}: EpisodeActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const episode = record.flattened as unknown as AlertEpisode;
  const compatibleActions = useMemo(
    () =>
      actions
        .filter((action) => action.isCompatible({ episodes: [episode] }))
        .sort((a, b) => a.order - b.order),
    [actions, episode]
  );

  const button = (
    <Control
      data-test-subj="alertsV2ActionsMenuButton"
      iconType="boxesVertical"
      label={MORE_ACTIONS_LABEL}
      tooltipContent={MORE_ACTIONS_LABEL}
      disabled={compatibleActions.length === 0}
      onClick={() => setIsOpen((open) => !open)}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downCenter"
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        size="s"
        items={compatibleActions.map((action) => (
          <EuiContextMenuItem
            key={action.id}
            icon={action.iconType}
            data-test-subj={`alertsV2Action-${action.id}`}
            onClick={() => {
              setIsOpen(false);
              void action.execute({ episodes: [episode], onSuccess });
            }}
          >
            {action.displayName}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};
