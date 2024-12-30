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
  GRAPH_LABEL_EXPAND_POPOVER_TEST_ID,
  GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID,
} from '../test_ids';

interface GraphLabelExpandPopoverProps {
  isOpen: boolean;
  anchorElement: HTMLElement | null;
  closePopover: () => void;
  onShowEventsWithThisActionClick: () => void;
}

export const GraphLabelExpandPopover = memo<GraphLabelExpandPopoverProps>(
  ({ isOpen, anchorElement, closePopover, onShowEventsWithThisActionClick }) => {
    return (
      <GraphPopover
        panelPaddingSize="s"
        anchorPosition="rightCenter"
        isOpen={isOpen}
        anchorElement={anchorElement}
        closePopover={closePopover}
        data-test-subj={GRAPH_LABEL_EXPAND_POPOVER_TEST_ID}
      >
        <EuiListGroup gutterSize="none" bordered={false} flush={true}>
          <ExpandPopoverListItem
            iconType="users"
            label={i18n.translate(
              'securitySolutionPackages.csp.graph.graphLabelExpandPopover.showEventsWithThisAction',
              { defaultMessage: 'Show events with this action' }
            )}
            onClick={onShowEventsWithThisActionClick}
            data-test-subj={GRAPH_LABEL_EXPAND_POPOVER_SHOW_EVENTS_WITH_THIS_ACTION_ITEM_ID}
          />
        </EuiListGroup>
      </GraphPopover>
    );
  }
);

GraphLabelExpandPopover.displayName = 'GraphLabelExpandPopover';
