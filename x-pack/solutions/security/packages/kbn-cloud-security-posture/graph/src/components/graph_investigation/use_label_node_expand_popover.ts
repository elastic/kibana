/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { useNodeExpandGraphPopover } from './use_node_expand_graph_popover';
import type { NodeProps } from '../../..';
import {
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
  GRAPH_LABEL_EXPAND_POPOVER_TEST_ID,
} from '../test_ids';
import {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from './list_group_graph_popover';
import { EVENT_ACTION } from '../../common/constants';
import { addFilter, containsFilter, removeFilter } from './search_filters';

type NodeToggleAction = 'show' | 'hide';

/**
 * Hook to handle the label node expand popover.
 * This hook is used to show the popover when the user clicks on the expand button of a label node.
 * The popover contains the actions to show/hide the events with this action.
 *
 * @param setSearchFilters - Function to set the search filters.
 * @param dataViewId - The data view id.
 * @param searchFilters - The search filters.
 * @returns The label node expand popover.
 */
export const useLabelNodeExpandPopover = (
  setSearchFilters: React.Dispatch<React.SetStateAction<Filter[]>>,
  dataViewId: string,
  searchFilters: Filter[]
) => {
  const onShowEventsWithThisActionClick = useCallback(
    (node: NodeProps, action: NodeToggleAction) => {
      if (action === 'show') {
        setSearchFilters((prev) =>
          addFilter(dataViewId, prev, EVENT_ACTION, node.data.label ?? '')
        );
      } else if (action === 'hide') {
        setSearchFilters((prev) => removeFilter(prev, EVENT_ACTION, node.data.label ?? ''));
      }
    },
    [dataViewId, setSearchFilters]
  );

  const itemsFn = useCallback(
    (
      node: NodeProps
    ): Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> => {
      const eventsWithThisActionToggleAction = containsFilter(
        searchFilters,
        EVENT_ACTION,
        node.data.label ?? ''
      )
        ? 'hide'
        : 'show';

      return [
        {
          type: 'item',
          iconType: 'users',
          testSubject: GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
          label:
            eventsWithThisActionToggleAction === 'show'
              ? i18n.translate(
                  'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showEventsWithThisAction',
                  { defaultMessage: 'Show events with this action' }
                )
              : i18n.translate(
                  'securitySolutionPackages.csp.graph.graphLabelExpandPopover.hideEventsWithThisAction',
                  { defaultMessage: 'Hide events with this action' }
                ),
          onClick: () => {
            onShowEventsWithThisActionClick(node, eventsWithThisActionToggleAction);
          },
        },
      ];
    },
    [onShowEventsWithThisActionClick, searchFilters]
  );
  const labelNodeExpandPopover = useNodeExpandGraphPopover({
    id: 'label-node-expand-popover',
    testSubject: GRAPH_LABEL_EXPAND_POPOVER_TEST_ID,
    itemsFn,
  });
  return labelNodeExpandPopover;
};
