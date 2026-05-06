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
import type { SecurityAlertEpisode } from '../hooks/use_fetch_security_episodes';
import type { SecurityEpisodeAction } from '../actions/workflow_actions';
import * as i18n from '../translations';

interface NotImplementedAction {
  label: string;
  icon: string;
}

const HIDDEN_V2_ACTION_IDS = new Set([
  'ALERTING_V2_VIEW_EPISODE_DETAILS',
  'ALERTING_V2_OPEN_EPISODE_IN_DISCOVER',
  'ALERTING_V2_RESOLVE_EPISODE',
  'ALERTING_V2_UNRESOLVE_EPISODE',
  'ALERTING_V2_ACK_EPISODE',
  'ALERTING_V2_UNACK_EPISODE',
]);

const NOT_IMPLEMENTED_ACTIONS: NotImplementedAction[] = [
  { label: i18n.ACTION_ADD_TO_CASE, icon: 'folderOpen' },
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
  securityActions: SecurityEpisodeAction[];
  episode: SecurityAlertEpisode;
  onActionSuccess: () => void;
  renderCustomButton?: (onClick: () => void) => React.ReactNode;
}

export const TakeActionDropdown: React.FC<TakeActionDropdownProps> = ({
  episodeActions,
  securityActions,
  episode,
  onActionSuccess,
  renderCustomButton,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const togglePopover = useCallback(() => setIsPopoverOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const securityItems: EuiContextMenuPanelItemDescriptor[] = useMemo(
    () =>
      securityActions
        .filter((action) => action.isCompatible({ episodes: [episode] }))
        .map((action) => ({
          name: action.displayName,
          icon: action.iconType,
          onClick: () => {
            closePopover();
            action.execute({ episodes: [episode], onSuccess: onActionSuccess });
          },
        })),
    [securityActions, episode, closePopover, onActionSuccess]
  );

  const v2Items: EuiContextMenuPanelItemDescriptor[] = useMemo(
    () =>
      episodeActions
        .filter((action) => !HIDDEN_V2_ACTION_IDS.has(action.id))
        .map((action) => {
          const compatible = action.isCompatible({ episodes: [episode as any] });
          return {
            name: action.displayName,
            icon: action.iconType,
            disabled: !compatible,
            onClick: () => {
              closePopover();
              action.execute({ episodes: [episode as any], onSuccess: onActionSuccess });
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
        items: [...securityItems, ...v2Items, ...notImplementedItems],
      },
    ],
    [securityItems, v2Items, notImplementedItems]
  );

  const defaultButton = useMemo(
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

  const button = renderCustomButton ? renderCustomButton(togglePopover) : defaultButton;

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
