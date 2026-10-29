/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiCodeBlock,
  EuiButtonGroup,
  EuiSpacer,
} from '@elastic/eui';
import { WorkflowGraph } from './workflow_graph';
import * as i18n from './translations';

export interface TranslationTabProps {
  yaml: string;
}

const VIEW_OPTIONS = [
  { id: 'graph', label: i18n.GRAPH_VIEW, iconType: 'workflow', toolTipContent: i18n.GRAPH_VIEW },
  { id: 'yaml', label: i18n.YAML_VIEW, iconType: 'code', toolTipContent: i18n.YAML_VIEW },
];

export const TranslationTab: React.FC<TranslationTabProps> = React.memo(({ yaml }) => {
  const [selectedView, setSelectedView] = useState('yaml');

  return (
    <>
      <EuiSpacer size="l" />
      <EuiCallOut title={i18n.REVIEW_CALLOUT_TITLE} color="warning" iconType="warning" size="s">
        <p>{i18n.REVIEW_CALLOUT_DESCRIPTION}</p>
      </EuiCallOut>
      <EuiSpacer size="l" />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <strong>{i18n.ELASTIC_WORKFLOWS.toUpperCase()}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.VIEW_TOGGLE_LEGEND}
            options={VIEW_OPTIONS}
            idSelected={selectedView}
            onChange={setSelectedView}
            buttonSize="compressed"
            isIconOnly
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {selectedView === 'yaml' ? (
        <EuiCodeBlock language="yaml" fontSize="s" paddingSize="m" isCopyable overflowHeight={640}>
          {yaml}
        </EuiCodeBlock>
      ) : (
        <WorkflowGraph />
      )}
    </>
  );
});
TranslationTab.displayName = 'TranslationTab';
