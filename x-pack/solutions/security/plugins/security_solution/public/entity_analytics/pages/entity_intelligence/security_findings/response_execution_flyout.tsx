/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useKibana } from '../../../../common/lib/kibana';
import { AgentTimestamp } from '../ai_agents/agent_evidence';
import type { SecurityFinding } from './types';
import type { FindingResponseEvidence } from './response_evidence';
import { workflowExecutionPath } from './response_evidence';
import { useResponseExecution } from './use_response_execution';
import type { ResponseExecutionStatus, ResponseExecutionStep } from './response_execution_model';

const statusLabel: Record<ResponseExecutionStatus, string> = {
  completed: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.completed',
    { defaultMessage: 'Completed' }
  ),
  failed: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.failed',
    { defaultMessage: 'Failed' }
  ),
  cancelled: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.cancelled',
    { defaultMessage: 'Cancelled' }
  ),
  timed_out: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.timedOut',
    { defaultMessage: 'Timed out' }
  ),
  skipped: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.skipped',
    { defaultMessage: 'Skipped' }
  ),
  running: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.running',
    { defaultMessage: 'Running' }
  ),
  pending: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.pending',
    { defaultMessage: 'Pending' }
  ),
  waiting: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.waiting',
    { defaultMessage: 'Waiting' }
  ),
  waiting_for_input: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.waitingInput',
    { defaultMessage: 'Waiting for input' }
  ),
  waiting_for_child: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.waitingChild',
    { defaultMessage: 'Waiting for child workflow' }
  ),
  queued: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.queued',
    { defaultMessage: 'Queued' }
  ),
};

const stepTitle: Record<ResponseExecutionStep['id'], string> = {
  read_current_export_bucket_iam: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.read',
    { defaultMessage: 'Read bucket permissions' }
  ),
  revoke_agent_export_permission: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.revoke',
    { defaultMessage: 'Remove export permission' }
  ),
  read_back_google_iam_policy: i18n.translate(
    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.verify',
    { defaultMessage: 'Verify Google IAM change' }
  ),
};

/** Keeps the verified native response and later blocked call in the current investigation. */
export const ResponseExecutionFlyout: React.FC<{
  finding: SecurityFinding;
  response: FindingResponseEvidence;
  onClose: () => void;
}> = ({ finding, response, onClose }) => {
  const { application } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'responseExecution' });
  const detailsId = useGeneratedHtmlId({ prefix: 'responseExecutionDetails' });
  const { execution, loading, error, refresh } = useResponseExecution(response);
  const responsePrecedesExport = Boolean(
    execution?.status === 'completed' &&
      execution.finishedAt &&
      Number.isFinite(Date.parse(finding.timestamp)) &&
      Date.parse(execution.finishedAt) <= Date.parse(finding.timestamp)
  );
  const url = application.getUrlForApp('workflows', { path: workflowExecutionPath(response) });
  return (
    <EuiFlyout
      ownFocus
      size="m"
      onClose={onClose}
      onClick={(event) => event.stopPropagation()}
      aria-labelledby={titleId}
      data-test-subj="responseExecutionFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="workflow" size="l" color="primary" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 id={titleId}>
                {i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.title',
                  { defaultMessage: 'Response workflow' }
                )}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {execution && (
            <EuiFlexItem grow={false}>
              <EuiBadge color={execution.status === 'completed' ? 'success' : 'warning'}>
                {statusLabel[execution.status]}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        {execution && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s">{execution.name}</EuiText>
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {loading && (
          <EuiSkeletonText
            lines={6}
            isLoading
            contentAriaLabel={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.loading',
              { defaultMessage: 'Loading recorded workflow execution' }
            )}
          />
        )}
        {error && (
          <KbnWarningCallout
            announceOnMount
            iconType="warning"
            title={i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.unavailable',
              { defaultMessage: 'Execution details are unavailable' }
            )}
          >
            <p>
              {error === 'forbidden'
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.forbidden',
                    {
                      defaultMessage:
                        'Your account needs permission to view this workflow execution.',
                    }
                  )
                : error === 'not_found'
                ? i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.notFound',
                    {
                      defaultMessage:
                        'This execution was not found in the current space. The finding still retains its recorded response reference.',
                    }
                  )
                : i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.notVerified',
                    {
                      defaultMessage:
                        'The execution could not be loaded and verified against this finding. Open Workflows to inspect the recorded reference.',
                    }
                  )}
            </p>
            <EuiButtonEmpty onClick={refresh} iconType="refresh" size="s">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.retry',
                { defaultMessage: 'Try again' }
              )}
            </EuiButtonEmpty>
          </KbnWarningCallout>
        )}
        {execution && (
          <>
            <EuiPanel color="primary" hasShadow={false} paddingSize="m">
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="shield" color="primary" size="l" aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="m">
                    <strong>
                      {i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.blockedExport',
                        { defaultMessage: 'Google blocked this export' }
                      )}
                    </strong>
                  </EuiText>
                  <EuiText size="s">
                    {responsePrecedesExport
                      ? i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.blockedDetail',
                          {
                            defaultMessage:
                              'The recorded tool call received HTTP 403 after this response.',
                          }
                        )
                      : i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.linkedDetail',
                          {
                            defaultMessage:
                              'The finding links this denied tool call to the recorded response execution. Their time order could not be verified.',
                          }
                        )}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer size="l" />
            <EuiSteps
              titleSize="xs"
              steps={[
                {
                  title: i18n.translate(
                    'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.detectTitle',
                    { defaultMessage: 'Restricted lookup detected' }
                  ),
                  status: 'complete',
                  children: (
                    <EuiText size="s">
                      <p>
                        {i18n.translate(
                          'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.detectDetail',
                          {
                            defaultMessage:
                              'The exact lookup alert triggered this Elastic workflow.',
                          }
                        )}
                      </p>
                      {execution.startedAt && <AgentTimestamp value={execution.startedAt} />}
                    </EuiText>
                  ),
                },
                {
                  title: execution.permissionRemoved
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.removedTitle',
                        { defaultMessage: 'Export permission removed' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.inspectTitle',
                        { defaultMessage: 'Inspect permission change' }
                      ),
                  status: execution.permissionRemoved ? 'complete' : 'warning',
                  children: (
                    <>
                      <EuiText size="s">
                        <p>
                          {i18n.translate(
                            'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.apiDetail',
                            {
                              defaultMessage:
                                'Native workflow HTTP steps called Google Storage IAM.',
                            }
                          )}
                        </p>
                      </EuiText>
                      {execution.steps.map((step) => (
                        <div
                          key={step.id}
                          data-test-subj="responseExecutionHttpStep"
                          css={css`
                            border-bottom: ${euiTheme.border.thin};
                            padding: ${euiTheme.size.s} 0;
                          `}
                        >
                          <EuiFlexGroup
                            justifyContent="spaceBetween"
                            gutterSize="s"
                            alignItems="center"
                            responsive={false}
                          >
                            <EuiFlexItem>
                              <EuiText size="s">
                                <strong>{stepTitle[step.id]}</strong>
                              </EuiText>
                              <EuiText size="xs" color="subdued">
                                {step.method}
                                {step.httpStatus !== undefined && ` · HTTP ${step.httpStatus}`}
                                {step.duration !== undefined && ` · ${step.duration} ms`}
                              </EuiText>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiBadge
                                color={
                                  step.status === 'completed' && step.httpStatus === 200
                                    ? 'success'
                                    : 'warning'
                                }
                              >
                                {statusLabel[step.status]}
                              </EuiBadge>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </div>
                      ))}
                      {!execution.permissionRemoved && (
                        <>
                          <EuiSpacer size="s" />
                          <EuiText size="xs" color="subdued">
                            {i18n.translate(
                              'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.incomplete',
                              {
                                defaultMessage:
                                  'The loaded steps do not establish a fresh grant removal. Review the full execution for missing steps or an already absent grant.',
                              }
                            )}
                          </EuiText>
                        </>
                      )}
                    </>
                  ),
                },
                {
                  title: responsePrecedesExport
                    ? i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.deniedTitle',
                        { defaultMessage: 'Later agent export denied' }
                      )
                    : i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.deniedUnorderedTitle',
                        { defaultMessage: 'Agent export denied' }
                      ),
                  status: 'complete',
                  children: (
                    <EuiText size="s">
                      <p>
                        <EuiCode>{finding.invocation?.toolName ?? 'export_case_summary'}</EuiCode>{' '}
                        <EuiBadge color="primary">{'HTTP 403'}</EuiBadge>
                      </p>
                      <AgentTimestamp value={finding.timestamp} />
                      <p
                        css={css`
                          overflow-wrap: anywhere;
                        `}
                      >
                        {finding.target}
                      </p>
                    </EuiText>
                  ),
                },
              ]}
            />
            <EuiAccordion
              id={detailsId}
              buttonContent={i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.details',
                { defaultMessage: 'Execution & affected access' }
              )}
              paddingSize="m"
            >
              <div
                css={css`
                  overflow-wrap: anywhere;
                `}
              >
                <EuiDescriptionList
                  compressed
                  type="column"
                  listItems={[
                    {
                      title: i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.executionId',
                        { defaultMessage: 'Execution' }
                      ),
                      description: response.executionId,
                    },
                    {
                      title: i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.principal',
                        { defaultMessage: 'Service account' }
                      ),
                      description: response.runtimePrincipal,
                    },
                    {
                      title: i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.role',
                        { defaultMessage: 'Removed role' }
                      ),
                      description: response.role,
                    },
                    {
                      title: i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.bucket',
                        { defaultMessage: 'Bucket' }
                      ),
                      description: response.bucket,
                    },
                    {
                      title: i18n.translate(
                        'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.trigger',
                        { defaultMessage: 'Triggering alert' }
                      ),
                      description: response.triggerAlertId,
                    },
                  ]}
                />
              </div>
            </EuiAccordion>
            <EuiSpacer size="m" />
            <EuiText size="xs" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.scope',
                {
                  defaultMessage:
                    'Historical response evidence. IAM changes do not undo the triggering lookup. Current permissions may have changed since this execution.',
                }
              )}
            </EuiText>
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.close',
                { defaultMessage: 'Close' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              iconType="external"
            >
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.responseExecution.openFull',
                { defaultMessage: 'Open full workflow execution' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
