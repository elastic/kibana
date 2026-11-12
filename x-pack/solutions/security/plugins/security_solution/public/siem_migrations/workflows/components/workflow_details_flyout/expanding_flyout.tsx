/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTabbedContent,
  type EuiTabbedContentTab,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { PHISHING_EMAIL_YAML_SHORT } from '../../common/workflow_content';
import { WorkflowViewer } from './workflow_viewer';
import { SummaryTab } from './summary_tab';
import { ExpandedWorkflowFlyout } from './expanded_workflow_flyout';
import * as i18n from './translations';

export interface WorkflowDetailsFlyoutExpandingProps {
  onClose: () => void;
}

/**
 * "Graph/Yaml expanding" variant: an S flyout with a graph / short-YAML preview.
 * Clicking the "Elastic Workflow" title opens an M flyout on top with the full view.
 */
export const WorkflowDetailsFlyoutExpanding: React.FC<WorkflowDetailsFlyoutExpandingProps> =
  React.memo(({ onClose }) => {
    const titleId = useGeneratedHtmlId({ prefix: 'workflowDetailsFlyoutExpandingTitle' });
    const [isExpanded, setIsExpanded] = useState(false);

    const tabs: EuiTabbedContentTab[] = useMemo(
      () => [
        {
          id: 'translation',
          name: i18n.TRANSLATION_TAB,
          content: (
            <>
              <EuiSpacer size="m" />
              <EuiTitle size="xs">
                <h3>
                  <EuiLink
                    onClick={() => setIsExpanded(true)}
                    data-test-subj="openExpandedWorkflow"
                  >
                    {i18n.OPEN_ELASTIC_WORKFLOW}
                  </EuiLink>
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <WorkflowViewer
                yaml={PHISHING_EMAIL_YAML_SHORT}
                maxHeight={420}
                showMinimap={false}
              />
            </>
          ),
        },
        {
          id: 'summary',
          name: i18n.SUMMARY_TAB,
          content: <SummaryTab />,
        },
      ],
      []
    );

    return (
      <>
        <EuiFlyout
          onClose={onClose}
          size="s"
          ownFocus={false}
          aria-labelledby={titleId}
          data-test-subj="workflowDetailsFlyoutExpanding"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id={titleId}>{i18n.FLYOUT_TITLE}</h2>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              {i18n.SOURCE_SUBTITLE}
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} />
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={onClose} flush="left">
                  {i18n.CANCEL}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton iconType="workflow" onClick={onClose}>
                      {i18n.INSTALL_AND_EDIT}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton fill onClick={onClose}>
                      {i18n.INSTALL}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
        {isExpanded && (
          <ExpandedWorkflowFlyout
            onBack={() => setIsExpanded(false)}
            onClose={() => {
              setIsExpanded(false);
              onClose();
            }}
          />
        )}
      </>
    );
  });
WorkflowDetailsFlyoutExpanding.displayName = 'WorkflowDetailsFlyoutExpanding';
