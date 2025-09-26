/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiButtonEmpty,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';

import type { SecurityWorkflowInsight } from '../../../../../../../../../common/endpoint/types/workflow_insights';
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

  const { euiTheme } = useEuiTheme();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showViewMore, setShowViewMore] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textElement = textRef.current;
    if (!textElement) return;

    const clone = textElement.cloneNode(true) as HTMLDivElement;
    clone.style.cssText = `
    position: absolute;
    visibility: hidden;
    height: auto;
    width: ${textElement.offsetWidth}px;
    -webkit-line-clamp: unset;
    display: block;
  `;

    document.body.appendChild(clone);
    setShowViewMore(clone.offsetHeight > textElement.offsetHeight);
    document.body.removeChild(clone);
  }, [insight.remediation.descriptive]);

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
          <EuiIcon type="globe" size="l" color="warning" css={{ marginTop: '18px' }} />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiText size="s">
            <EuiText
              size={'s'}
              css={{
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              <strong>{insight.metadata.display_name || insight.value}</strong>
            </EuiText>
            <div
              ref={textRef}
              css={{
                display: isExpanded ? 'block' : '-webkit-box',
                WebkitLineClamp: isExpanded ? 'none' : 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <EuiText size={'s'} color={'subdued'}>
                <span
                  css={{
                    // Hide the default ellipsis by creating our own truncation
                    display: !isExpanded && showViewMore ? 'inline' : 'contents',
                  }}
                >
                  {insight.remediation.descriptive}
                </span>
                {!isExpanded && showViewMore && (
                  <span
                    css={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: euiTheme.colors.backgroundBasePlain,
                    }}
                  >
                    {'... '}
                    <EuiLink onClick={() => setIsExpanded(true)} color="primary">
                      {expandMessage}
                    </EuiLink>
                  </span>
                )}
                {isExpanded && showViewMore && (
                  <>
                    {' '}
                    <EuiLink onClick={() => setIsExpanded(false)} color="primary">
                      {collapseMessage}
                    </EuiLink>
                  </>
                )}
              </EuiText>
            </div>
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false} css={{ marginLeft: 'auto' }}>
          <EuiButtonEmpty
            data-test-subj={`workflowInsightsResult-${index}-remediation`}
            aria-label={ariaLabel}
            iconType="popout"
            href={insight.remediation.link}
            target="_blank"
            css={{
              visibility: insight.remediation.link ? 'visible' : 'hidden',
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
