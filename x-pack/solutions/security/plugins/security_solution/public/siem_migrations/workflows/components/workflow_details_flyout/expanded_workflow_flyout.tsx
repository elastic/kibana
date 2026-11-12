/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { PHISHING_EMAIL_YAML } from '../../common/workflow_content';
import { WorkflowViewer } from './workflow_viewer';
import * as i18n from './translations';

export interface ExpandedWorkflowFlyoutProps {
  onBack: () => void;
  onClose: () => void;
}

/** M flyout stacked on top of the S details flyout: full graph/YAML with a bottom switcher. */
export const ExpandedWorkflowFlyout: React.FC<ExpandedWorkflowFlyoutProps> = React.memo(
  ({ onBack, onClose }) => {
    const titleId = useGeneratedHtmlId({ prefix: 'expandedWorkflowFlyoutTitle' });

    return (
      <EuiFlyout
        onClose={onClose}
        size="m"
        ownFocus={false}
        aria-labelledby={titleId}
        data-test-subj="expandedWorkflowFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="arrowLeft" size="s" flush="left" onClick={onBack}>
                {i18n.BACK}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="m">
                <h2 id={titleId}>{i18n.OPEN_ELASTIC_WORKFLOW}</h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <WorkflowViewer yaml={PHISHING_EMAIL_YAML} />
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
);
ExpandedWorkflowFlyout.displayName = 'ExpandedWorkflowFlyout';
