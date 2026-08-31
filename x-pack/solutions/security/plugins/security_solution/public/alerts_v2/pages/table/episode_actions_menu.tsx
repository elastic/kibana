/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiContextMenu, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord, RowControlComponent } from '@kbn/discover-utils';
import type { AlertEpisode } from '@kbn/alerting-v2-schemas';
import type { EpisodeAction } from '@kbn/alerting-v2-episodes-ui/actions';

const MORE_ACTIONS_LABEL = i18n.translate(
  'xpack.securitySolution.alertsV2.episodesTable.moreActions',
  { defaultMessage: 'More actions' }
);
const RUN_WORKFLOW_LABEL = i18n.translate(
  'xpack.securitySolution.alertsV2.episodesTable.runWorkflow',
  { defaultMessage: 'Run workflow' }
);
const SELECT_WORKFLOW_TITLE = i18n.translate(
  'xpack.securitySolution.alertsV2.episodesTable.selectWorkflow',
  { defaultMessage: 'Select workflow' }
);

const MAIN_PANEL_ID = 0;
const RUN_WORKFLOW_PANEL_ID = 1;
const RUN_WORKFLOW_PANEL_WIDTH = 400;

export interface EpisodeActionsMenuProps {
  /** The grid's row-control button component, used as the popover anchor. */
  Control: RowControlComponent;
  /** The episode row; its `flattened` is the `AlertEpisode` the action factories consume. */
  record: DataTableRecord;
  /** The mutation actions (status ack/unack/resolve/unresolve, tags, assignees, add-to-case, …). */
  actions: EpisodeAction[];
  /** Called after an action succeeds, to refresh the table (the view is eventually consistent). */
  onSuccess: () => void;
  /**
   * When provided, adds a "Run workflow" item that opens a nested panel rendering the workflow
   * selector (built from the row). Omitted when workflows aren't available.
   */
  renderRunWorkflowPanel?: (closePopover: () => void) => React.ReactNode;
}

/**
 * Row "…" menu listing the mutation actions compatible with the episode — mirroring the v1 alerts
 * table's per-row "take action" menu. Each item is an RnA `EpisodeAction`: `isCompatible` decides
 * which apply, and `execute` posts the change (or opens its own editor). "Run workflow" is a nested
 * panel (the workflow selector), matching how v1 nests it in the take-action menu.
 */
export const EpisodeActionsMenu = ({
  Control,
  record,
  actions,
  onSuccess,
  renderRunWorkflowPanel,
}: EpisodeActionsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const episode = record.flattened as unknown as AlertEpisode;
  const compatibleActions = useMemo(
    () =>
      actions
        .filter((action) => action.isCompatible({ episodes: [episode] }))
        .sort((a, b) => a.order - b.order),
    [actions, episode]
  );

  const workflowContent = renderRunWorkflowPanel ? renderRunWorkflowPanel(closePopover) : null;

  const panels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
    const items = compatibleActions.map((action) => ({
      name: action.displayName,
      icon: action.iconType,
      'data-test-subj': `alertsV2Action-${action.id}`,
      onClick: () => {
        setIsOpen(false);
        void action.execute({ episodes: [episode], onSuccess });
      },
    }));

    if (workflowContent) {
      items.push({
        name: RUN_WORKFLOW_LABEL,
        icon: 'play',
        'data-test-subj': 'alertsV2RunWorkflow',
        // Navigating to the nested selector panel — no immediate onClick action.
        panel: RUN_WORKFLOW_PANEL_ID,
      } as (typeof items)[number]);
    }

    return [
      { id: MAIN_PANEL_ID, items },
      ...(workflowContent
        ? [
            {
              id: RUN_WORKFLOW_PANEL_ID,
              title: SELECT_WORKFLOW_TITLE,
              width: RUN_WORKFLOW_PANEL_WIDTH,
              content: workflowContent,
            },
          ]
        : []),
    ];
  }, [compatibleActions, episode, onSuccess, workflowContent]);

  const isEmpty = compatibleActions.length === 0 && !workflowContent;

  const button = (
    <Control
      data-test-subj="alertsV2ActionsMenuButton"
      iconType="boxesVertical"
      label={MORE_ACTIONS_LABEL}
      tooltipContent={MORE_ACTIONS_LABEL}
      disabled={isEmpty}
      onClick={() => setIsOpen((open) => !open)}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downCenter"
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={MAIN_PANEL_ID} panels={panels} />
    </EuiPopover>
  );
};
