/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiContextMenu,
  EuiPopover,
  EuiToolTip,
  type EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';
import type { AlertEpisode } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import * as i18n from '../translations';

interface NotImplementedAction {
  label: string;
  icon: string;
}

const HIDDEN_V2_ACTION_IDS = new Set([
  'ALERTING_V2_VIEW_EPISODE_DETAILS',
  'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER',
]);

const NOT_IMPLEMENTED_ACTIONS: NotImplementedAction[] = [
  { label: i18n.ACTION_ADD_TO_CASE, icon: 'folderOpen' },
  { label: i18n.ACTION_MARK_AS_OPEN, icon: 'securitySignal' },
  { label: i18n.ACTION_MARK_AS_CLOSED, icon: 'securitySignalResolved' },
  { label: i18n.ACTION_ADD_EXCEPTION, icon: 'minusInCircle' },
  { label: i18n.ACTION_RUN_WORKFLOW, icon: 'playFilled' },
  { label: i18n.ACTION_ISOLATE_HOST, icon: 'lock' },
  { label: i18n.ACTION_RESPOND, icon: 'console' },
  { label: i18n.ACTION_RUN_OSQUERY, icon: 'editorCodeBlock' },
  { label: i18n.ACTION_OPEN_IN_DISCOVER, icon: 'discoverApp' },
  { label: i18n.ACTION_INVESTIGATE_IN_TIMELINE, icon: 'timeline' },
];

interface TakeActionDropdownProps {
  episodeActions: EpisodeAction[];
  episode: AlertEpisode;
  onActionSuccess: () => void;
}

export const TakeActionDropdown: React.FC<TakeActionDropdownProps> = ({
  episodeActions,
  episode,
  onActionSuccess,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const v2Items: EuiContextMenuPanelItemDescriptor[] = useMemo(
    () =>
      episodeActions
        .filter((action) => !HIDDEN_V2_ACTION_IDS.has(action.id))
        .map((action) => {
          const compatible = action.isCompatible({ episodes: [episode] });
          return {
            name: action.displayName,
            icon: action.iconType,
            disabled: !compatible,
            onClick: () => {
              closePopover();
              action.execute({ episodes: [episode], onSuccess: onActionSuccess });
            },
          };
        }),
    [episodeActions, episode, closePopover, onActionSuccess]
  );

  const notImplementedItems: EuiContextMenuPanelItemDescriptor[] = useMemo(
    () =>
      NOT_IMPLEMENTED_ACTIONS.map((action) => ({
        name: (
          <EuiToolTip content={i18n.ACTION_NOT_IMPLEMENTED} position="left">
            <button type="button" disabled style={{ all: 'unset', cursor: 'default' }}>
              {action.label}
            </button>
          </EuiToolTip>
        ),
        icon: action.icon,
        disabled: true,
      })),
    []
  );

  const panels = useMemo(
    () => [
      {
        id: 0,
        items: [...notImplementedItems, ...v2Items],
      },
    ],
    [v2Items, notImplementedItems]
  );

  const button = useMemo(
    () => (
      <EuiButton
        fill
        iconSide="right"
        iconType="chevronSingleDown"
        onClick={togglePopover}
        data-test-subj="alertsV2TakeActionButton"
      >
        {i18n.TAKE_ACTION}
      </EuiButton>
    ),
    [togglePopover]
  );

  return (
    <EuiPopover
      id="alertsV2TakeActionPanel"
      aria-label={i18n.TAKE_ACTION}
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="upRight"
      repositionOnScroll
    >
      <EuiContextMenu
        size="s"
        initialPanelId={0}
        panels={panels}
        data-test-subj="alertsV2TakeActionMenu"
      />
    </EuiPopover>
  );
};
