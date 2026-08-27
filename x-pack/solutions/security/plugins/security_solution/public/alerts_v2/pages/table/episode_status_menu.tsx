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

const CHANGE_STATUS_LABEL = i18n.translate(
  'xpack.securitySolution.alertsV2.episodesTable.changeStatus',
  { defaultMessage: 'Change status' }
);

export interface EpisodeStatusMenuProps {
  /** The grid's row-control button component, used as the popover anchor. */
  Control: RowControlComponent;
  /** The episode row; its `flattened` is the `AlertEpisode` the action factories consume. */
  record: DataTableRecord;
  /** Status actions (ack/unack/resolve/unresolve), already built with `{ http, notifications }`. */
  actions: EpisodeAction[];
  /** Called after an action succeeds, to refresh the table (the view is eventually consistent). */
  onSuccess: () => void;
}

/**
 * Row control that opens a small menu of the status actions compatible with the given episode.
 * v2 has no open/acknowledged/closed field: "status" is a set of actions appended to
 * `.alert-actions` (ack/unack, resolve/unresolve). Each action's `execute` posts the change and
 * toasts; `isCompatible` decides which apply to the episode's current state.
 */
export const EpisodeStatusMenu = ({
  Control,
  record,
  actions,
  onSuccess,
}: EpisodeStatusMenuProps) => {
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
      data-test-subj="alertsV2StatusMenuButton"
      iconType="boxesVertical"
      label={CHANGE_STATUS_LABEL}
      tooltipContent={CHANGE_STATUS_LABEL}
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
            data-test-subj={`alertsV2StatusAction-${action.id}`}
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
