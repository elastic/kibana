/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana';
import { getFindingResponse, workflowExecutionPath } from './response_evidence';
import type { SecurityFinding } from './types';
import { ResponseExecutionFlyout } from './response_execution_flyout';

export const FindingResponseLink: React.FC<{ finding: SecurityFinding }> = ({ finding }) => {
  const [open, setOpen] = useState(false);
  const response = getFindingResponse(finding);
  if (!response) return null;
  return (
    <>
      <EuiButtonEmpty
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        size="xs"
        iconType="workflow"
        aria-label={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.openActionExecution',
          {
            defaultMessage: 'Open response workflow execution for {tool}',
            values: { tool: finding.invocation?.toolName ?? finding.title },
          }
        )}
      >
        {i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.link',
          {
            defaultMessage: 'Response',
          }
        )}
      </EuiButtonEmpty>
      {open && (
        <ResponseExecutionFlyout
          finding={finding}
          response={response}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

/** Shows the exact native response execution attached to the recorded denied action. */
export const FindingResponseEvidence: React.FC<{ finding: SecurityFinding }> = ({ finding }) => {
  const { application } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const [open, setOpen] = useState(false);
  const response = getFindingResponse(finding);
  if (!response) return null;
  const url = application.getUrlForApp('workflows', { path: workflowExecutionPath(response) });
  return (
    <EuiPanel hasShadow={false} hasBorder data-test-subj="securityFindingResponse">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.title',
                { defaultMessage: 'Response' }
              )}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={() => setOpen(true)} size="s" iconType="workflow">
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.openExecution',
              { defaultMessage: 'View response workflow' }
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m">
        {[
          {
            icon: 'bell',
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.trigger',
              { defaultMessage: 'Customer lookup detected' }
            ),
            detail: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.triggerDetail',
              { defaultMessage: 'An earlier lookup triggered the response.' }
            ),
          },
          {
            icon: 'gear',
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.action',
              { defaultMessage: 'Export permission removed' }
            ),
            detail: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.actionDetail',
              { defaultMessage: 'Elastic Workflows changed Google IAM and checked the result.' }
            ),
          },
          {
            icon: 'shield',
            title: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.outcome',
              { defaultMessage: 'This export was blocked' }
            ),
            detail: i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.outcomeDetail',
              { defaultMessage: 'Google Storage returned HTTP 403 for this tool call.' }
            ),
          },
        ].map((step) => (
          <EuiFlexItem key={step.title}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={step.icon} color="primary" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{step.title}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              {step.detail}
            </EuiText>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <div
        css={css`
          border-top: ${euiTheme.border.thin};
          padding-top: ${euiTheme.size.m};
          overflow-wrap: anywhere;
        `}
      >
        <EuiText size="xs">
          <p>
            <EuiCode>{response.runtimePrincipal}</EuiCode>{' '}
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.removedGrant',
              {
                defaultMessage: 'lost {role} on {bucket}.',
                values: { role: response.role, bucket: response.bucket },
              }
            )}
          </p>
        </EuiText>
        <EuiBadge color="hollow">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.execution',
            { defaultMessage: 'Execution {id}', values: { id: response.executionId } }
          )}
        </EuiBadge>
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          size="xs"
          iconType="external"
        >
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.openFull',
            { defaultMessage: 'Open full workflow execution' }
          )}
        </EuiButtonEmpty>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.findingResponse.scope',
            {
              defaultMessage:
                'The lookup and this export are separate actions. The response contained later writes; it did not undo or block the original lookup. This is the recorded response, not a check of current access.',
            }
          )}
        </EuiText>
      </div>
      {open && (
        <ResponseExecutionFlyout
          finding={finding}
          response={response}
          onClose={() => setOpen(false)}
        />
      )}
    </EuiPanel>
  );
};
