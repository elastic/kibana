/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiListGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExpandPopoverListItem } from '../styles';
import { GraphPopover } from '../../..';
import {
  GRAPH_NODE_EXPAND_POPOVER_TEST_ID,
  GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
} from '../test_ids';

export type NodeToggleAction = 'show' | 'hide';

/**
 * Props for the GraphNodeExpandPopover component.
 */
interface GraphNodeExpandPopoverProps {
  /**
   * Indicates whether the popover is open.
   */
  isOpen: boolean;

  /**
   * The HTML element that the popover is anchored to.
   */
  anchorElement: HTMLElement | null;

  /**
   * Function to close the popover.
   */
  closePopover: () => void;

  /**
   * Action to toggle related entities.
   */
  relatedEntitiesAction: NodeToggleAction;

  /**
   * Action to toggle actions by entity.
   */
  actionsByEntityAction: NodeToggleAction;

  /**
   * Action to toggle actions on entity.
   */
  actionsOnEntityAction: NodeToggleAction;

  /**
   * Callback function when related entities are clicked.
   * @param action - The action to take. 'show' to show related entities, 'hide' to hide.
   */
  onToggleRelatedEntitiesClick: (action: NodeToggleAction) => void;

  /**
   * Callback function when actions by entity are clicked.
   * @param action - The action to take. 'show' to show actions by entity, 'hide' to hide.
   */
  onToggleActionsByEntityClick: (action: NodeToggleAction) => void;

  /**
   * Callback function when actions on entity are clicked.
   * @param action - The action to take. 'show' to show actions on entity, 'hide' to hide.
   */
  onToggleActionsOnEntityClick: (action: NodeToggleAction) => void;
}

export const GraphNodeExpandPopover = memo<GraphNodeExpandPopoverProps>(
  ({
    isOpen,
    anchorElement,
    closePopover,
    relatedEntitiesAction,
    actionsByEntityAction,
    actionsOnEntityAction,
    onToggleRelatedEntitiesClick,
    onToggleActionsByEntityClick,
    onToggleActionsOnEntityClick,
  }) => {
    return (
      <GraphPopover
        panelPaddingSize="s"
        anchorPosition="rightCenter"
        isOpen={isOpen}
        anchorElement={anchorElement}
        closePopover={closePopover}
        data-test-subj={GRAPH_NODE_EXPAND_POPOVER_TEST_ID}
      >
        <EuiListGroup gutterSize="none" bordered={false} flush={true}>
          <ExpandPopoverListItem
            iconType="users"
            label={
              actionsByEntityAction === 'show'
                ? i18n.translate(
                    'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showActionsByEntity',
                    {
                      defaultMessage: 'Show actions by this entity',
                    }
                  )
                : i18n.translate(
                    'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideActionsByEntity',
                    {
                      defaultMessage: 'Hide actions by this entity',
                    }
                  )
            }
            onClick={() => onToggleActionsByEntityClick(actionsByEntityAction)}
            data-test-subj={GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID}
          />
          <ExpandPopoverListItem
            iconType="storage"
            label={
              actionsOnEntityAction === 'show'
                ? i18n.translate(
                    'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showActionsOnEntity',
                    {
                      defaultMessage: 'Show actions on this entity',
                    }
                  )
                : i18n.translate(
                    'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideActionsOnEntity',
                    {
                      defaultMessage: 'Hide actions on this entity',
                    }
                  )
            }
            onClick={() => onToggleActionsOnEntityClick(actionsOnEntityAction)}
            data-test-subj={GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID}
          />
          <ExpandPopoverListItem
            iconType="visTagCloud"
            label={
              relatedEntitiesAction === 'show'
                ? i18n.translate(
                    'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showRelatedEntities',
                    {
                      defaultMessage: 'Show related entities',
                    }
                  )
                : i18n.translate(
                    'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideRelatedEntities',
                    {
                      defaultMessage: 'Hide related entities',
                    }
                  )
            }
            onClick={() => onToggleRelatedEntitiesClick(relatedEntitiesAction)}
            data-test-subj={GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID}
          />
        </EuiListGroup>
      </GraphPopover>
    );
  }
);

GraphNodeExpandPopover.displayName = 'GraphNodeExpandPopover';
