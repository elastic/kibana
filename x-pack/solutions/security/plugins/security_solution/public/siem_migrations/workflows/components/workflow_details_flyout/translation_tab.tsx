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
  EuiPanel,
  EuiIcon,
  EuiText,
  EuiBadge,
  EuiCodeBlock,
  EuiButtonGroup,
  EuiSpacer,
} from '@elastic/eui';
import { PHISHING_EMAIL_STEPS } from '../../common/workflow_content';
import { WorkflowGraph } from './workflow_graph';
import * as i18n from './translations';

export interface TranslationTabProps {
  yaml: string;
}

const VIEW_OPTIONS = [
  { id: 'yaml', label: i18n.YAML_VIEW },
  { id: 'graph', label: i18n.GRAPH_VIEW },
];

export const TranslationTab: React.FC<TranslationTabProps> = React.memo(({ yaml }) => {
  const [selectedView, setSelectedView] = useState('yaml');

  return (
    <>
      <EuiSpacer size="l" />
      <EuiCallOut title={i18n.REVIEW_CALLOUT_TITLE} color="warning" iconType="warning" size="s" />
      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem grow={1}>
          <EuiText size="xs" color="subdued">
            <strong>{i18n.ORIGINAL_STEPS.toUpperCase()}</strong>
          </EuiText>
          <EuiSpacer size="s" />
          {PHISHING_EMAIL_STEPS.map((step) => (
            <React.Fragment key={step.title}>
              <EuiPanel hasBorder paddingSize="s">
                <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type={step.status === 'mapped' ? 'checkInCircleFilled' : 'warning'}
                      color={step.status === 'mapped' ? 'success' : 'warning'}
                      aria-hidden={true}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>{step.title}</strong>
                      {'  '}
                      <EuiText
                        component="span"
                        size="xs"
                        color={step.status === 'mapped' ? 'success' : 'warning'}
                      >
                        {step.status === 'mapped' ? i18n.MAPPED : i18n.NEEDS_REVIEW}
                      </EuiText>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {step.description}
                    </EuiText>
                    <EuiSpacer size="xs" />
                    <EuiBadge color="hollow">{step.tag}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <strong>{i18n.ELASTIC_WORKFLOWS.toUpperCase()}</strong>
                  </EuiText>
                </EuiFlexItem>
                {selectedView === 'yaml' && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow" iconType="pencil">
                      {i18n.EDITABLE}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend={i18n.VIEW_TOGGLE_LEGEND}
                options={VIEW_OPTIONS}
                idSelected={selectedView}
                onChange={setSelectedView}
                buttonSize="compressed"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          {selectedView === 'yaml' ? (
            <EuiCodeBlock
              language="yaml"
              fontSize="s"
              paddingSize="m"
              isCopyable
              overflowHeight={640}
            >
              {yaml}
            </EuiCodeBlock>
          ) : (
            <WorkflowGraph />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});
TranslationTab.displayName = 'TranslationTab';
