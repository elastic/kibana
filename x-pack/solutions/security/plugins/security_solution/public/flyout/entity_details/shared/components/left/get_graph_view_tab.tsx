/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EntityDetailsLeftPanelTab } from '../left_panel/left_panel_header';
import { GRAPH_VIEW_TAB_TEST_ID } from './test_ids';
import { GraphViewTab } from './graph_view_tab';

export interface GetGraphViewTabParams {
  /** Entity Store v2 entity ID (`entity.id`) to center the graph on */
  entityId: string;
  /** Scope ID for the flyout panel */
  scopeId: string;
}

export const getGraphViewTab = ({ entityId, scopeId }: GetGraphViewTabParams) => {
  return {
    id: EntityDetailsLeftPanelTab.GRAPH_VIEW,
    'data-test-subj': GRAPH_VIEW_TAB_TEST_ID,
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.userDetails.graphView.tabLabel"
        defaultMessage="Graph View"
      />
    ),
    content: <GraphViewTab entityId={entityId} scopeId={scopeId} />,
    isTechnicalPreview: true,
  };
};
