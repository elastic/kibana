/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PREFIX } from '../../../../../flyout/shared/test_ids';

export const GRAPH_VIEW_SUB_TABS_TEST_ID = `${PREFIX}GraphViewSubTabs` as const;

export enum GraphViewSubTab {
  ENTITY_GRAPH = 'entity_graph',
  BLAST_RADIUS = 'blast_radius',
}

const SUB_TAB_OPTIONS = [
  {
    id: GraphViewSubTab.ENTITY_GRAPH,
    label: i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.graphView.entityGraphSubTab',
      { defaultMessage: 'Entity graph' }
    ),
  },
  {
    id: GraphViewSubTab.BLAST_RADIUS,
    label: i18n.translate(
      'xpack.securitySolution.flyout.entityDetails.graphView.blastRadiusSubTab',
      { defaultMessage: 'Blast radius' }
    ),
  },
];

export interface GraphViewSubTabsProps {
  selected: GraphViewSubTab;
  onChange: (subTab: GraphViewSubTab) => void;
}

/** Button group switching the entity graph tool between the entity graph and the blast radius. */
export const GraphViewSubTabs: FC<GraphViewSubTabsProps> = memo(({ selected, onChange }) => {
  const handleChange = useCallback((id: string) => onChange(id as GraphViewSubTab), [onChange]);

  return (
    <EuiButtonGroup
      data-test-subj={GRAPH_VIEW_SUB_TABS_TEST_ID}
      legend={i18n.translate(
        'xpack.securitySolution.flyout.entityDetails.graphView.subTabsLegend',
        {
          defaultMessage: 'Graph views',
        }
      )}
      options={SUB_TAB_OPTIONS}
      idSelected={selected}
      onChange={handleChange}
      buttonSize="compressed"
    />
  );
});

GraphViewSubTabs.displayName = 'GraphViewSubTabs';
