/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useTruncateText } from '@kbn/react-hooks';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiButtonEmpty,
  EuiLink,
} from '@elastic/eui';

import type { SecurityWorkflowInsight } from '../../../../../../../../../common/endpoint/types/workflow_insights';
import { toExternalDocLink } from '../../../../../../../../../common/endpoint/utils/external_doc_link';
import { WORKFLOW_INSIGHTS } from '../../../../translations';

interface WorkflowInsightsPolicyResponseFailureResultProps {
  insight: SecurityWorkflowInsight;
  index: number;
}

export const WorkflowInsightsPolicyResponseFailureResult = ({
  insight,
  index,
}: WorkflowInsightsPolicyResponseFailureResultProps) => {
  const { ariaLabel, actionText, expandMessage, collapseMessage } =
    WORKFLOW_INSIGHTS.issues.remediationButton.policyResponseFailure;

  const { displayText, isExpanded, toggleExpanded, shouldTruncate } = useTruncateText(
    // Single pass so an escaped backslash followed by `n` (e.g. `C:\\new`) is not turned into a newline.
    (insight.remediation.descriptive ?? '').replace(/\\([\\n])/g, (_match, char: string) =>
      char === 'n' ? '\n' : '\\'
    ),
    120
  );

  const safeLink = toExternalDocLink(insight.remediation.link);

  return (
    <EuiPanel
      paddingSize="m"
      hasShadow={false}
      hasBorder
      key={index}
      data-test-subj={`workflowInsightsResult-${index}`}
    >
      <EuiFlexGroup alignItems={'flexStart'} gutterSize={'m'}>
        <EuiFlexItem grow={false}>
          <EuiIcon
            type="globe"
            size="l"
            color="warning"
            aria-hidden={true}
            css={{ marginTop: '18px' }}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText size="s">
            <strong>{insight.metadata.display_name || insight.value}</strong>
          </EuiText>
          <EuiText size="s" color="subdued">
            {displayText}
            {shouldTruncate && (
              <>
                {' '}
                <EuiLink onClick={toggleExpanded}>
                  {isExpanded ? collapseMessage : expandMessage}
                </EuiLink>
              </>
            )}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false} css={{ marginLeft: 'auto' }}>
          <EuiButtonEmpty
            data-test-subj={`workflowInsightsResult-${index}-remediation`}
            aria-label={ariaLabel}
            iconType="external"
            href={safeLink}
            target="_blank"
            rel="noopener noreferrer"
            css={{
              visibility: safeLink ? 'visible' : 'hidden',
              marginTop: '10px',
            }}
          >
            {actionText}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
