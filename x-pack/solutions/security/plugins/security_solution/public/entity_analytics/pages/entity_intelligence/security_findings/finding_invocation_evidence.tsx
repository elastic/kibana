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
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ContentRedactor } from '../../../../../common/entity_intelligence/content_redaction';
import type { SecurityFinding } from './types';

interface FindingInvocationEvidenceProps {
  finding: SecurityFinding;
  redactor: ContentRedactor;
  sourceUrl?: string;
}

/** Shows tool inputs tied to the finding by a recorded native observation or request identifier. */
export const FindingInvocationEvidence: React.FC<FindingInvocationEvidenceProps> = ({
  finding,
  redactor,
  sourceUrl,
}) => {
  const { euiTheme } = useEuiTheme();
  const identifiersId = useGeneratedHtmlId({ prefix: 'findingInvocation' });
  const invocation = finding.invocation;
  if (!invocation) {
    return finding.agent ? (
      <div
        data-test-subj="securityFindingUnattributed"
        css={css`
          padding: ${euiTheme.size.m};
          border: ${euiTheme.border.thin};
          border-radius: ${euiTheme.border.radius.medium};
        `}
      >
        <EuiText size="s">
          <EuiIcon type="link" aria-hidden={true} />{' '}
          <strong>
            {i18n.translate(
              'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.unattributedTitle',
              { defaultMessage: 'No exact tool or prompt attribution' }
            )}
          </strong>
        </EuiText>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.unattributedDescription',
            {
              defaultMessage:
                'This finding is associated with the session. Its evidence does not identify the originating tool call or prompt.',
            }
          )}
        </EuiText>
      </div>
    ) : null;
  }
  const input = redactor.redact(invocation.input, 6000);
  const redact = (value: string): string => redactor.redact(value, 512).text;
  return (
    <section
      data-test-subj="securityFindingInvocation"
      css={css`
        padding: ${euiTheme.size.l};
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h3>
              <EuiIcon type="commandLine" color="primary" aria-hidden={true} />{' '}
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.title',
                { defaultMessage: 'Originating tool call' }
              )}
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{redact(invocation.toolName)}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {invocation.operationOutcome === 'success'
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.succeeded',
                  { defaultMessage: 'Recorded tool result: succeeded' }
                )
              : invocation.operationOutcome === 'failure'
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.failed',
                  { defaultMessage: 'Recorded tool result: failed' }
                )
              : typeof invocation.processExitCode === 'number' &&
                Number.isFinite(invocation.processExitCode)
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.exitCode',
                  {
                    defaultMessage: 'Recorded tool result: exited {code}',
                    values: { code: invocation.processExitCode },
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.resultMissing',
                  { defaultMessage: 'Tool result not recorded' }
                )}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {input.text ? (
        <EuiCodeBlock language="text" fontSize="s" paddingSize="m" overflowHeight={200} isCopyable>
          {input.text}
        </EuiCodeBlock>
      ) : (
        <EuiText size="s" color="subdued">
          {i18n.translate(
            'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.inputMissing',
            { defaultMessage: 'Tool input was not captured.' }
          )}
        </EuiText>
      )}
      {(input.redacted ||
        invocation.inputRedacted ||
        input.truncated ||
        invocation.inputTruncated) && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {(input.redacted || invocation.inputRedacted) &&
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.redacted',
                { defaultMessage: 'Recognized credential values are masked. ' }
              )}
            {(input.truncated || invocation.inputTruncated) &&
              i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.truncated',
                { defaultMessage: 'Input shortened for display.' }
              )}
          </EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            <EuiIcon type="link" size="s" aria-hidden={true} />{' '}
            {invocation.correlation === 'exact_native_observation'
              ? i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.nativeLink',
                  {
                    defaultMessage:
                      'This recorded tool input matched the saved policy revision. Detection only; no action was blocked.',
                  }
                )
              : i18n.translate(
                  'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.exactLink',
                  { defaultMessage: 'Matched to this policy decision by the recorded request ID.' }
                )}
          </EuiText>
        </EuiFlexItem>
        {sourceUrl && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="xs" href={sourceUrl} target="_blank" iconType="external">
              {i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.openTool',
                { defaultMessage: 'Open tool call in Discover' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiAccordion
        id={identifiersId}
        buttonContent={i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.identifiers',
          { defaultMessage: 'Attribution evidence' }
        )}
        paddingSize="s"
      >
        <dl
          css={css`
            display: grid;
            grid-template-columns: minmax(100px, 1fr) minmax(0, 4fr);
            gap: ${euiTheme.size.s} ${euiTheme.size.m};
            font-size: ${euiTheme.size.m};
            overflow-wrap: anywhere;
          `}
        >
          {[
            {
              label: i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.requestId',
                { defaultMessage: 'Request ID' }
              ),
              value: invocation.requestId,
            },
            {
              label: i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.callId',
                { defaultMessage: 'Tool call ID' }
              ),
              value: invocation.toolCallId,
            },
            ...(invocation.turnId
              ? [
                  {
                    label: i18n.translate(
                      'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.turnId',
                      { defaultMessage: 'Turn ID' }
                    ),
                    value: invocation.turnId,
                  },
                ]
              : []),
            {
              label: i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.source',
                { defaultMessage: 'Input source' }
              ),
              value: invocation.inputSource,
            },
            {
              label: i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.recordHash',
                { defaultMessage: 'Input record hash' }
              ),
              value: invocation.inputRecordHash,
            },
            {
              label: i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.findingInvocation.recordReference',
                { defaultMessage: 'Tool document' }
              ),
              value: `${invocation.source.index} · ${invocation.source.id}`,
            },
          ]
            .filter(
              (item): item is { label: string; value: string } => typeof item.value === 'string'
            )
            .map(({ label, value }) => (
              <React.Fragment key={label}>
                <dt>{label}</dt>
                <dd>
                  <EuiCode>{redact(value)}</EuiCode>
                </dd>
              </React.Fragment>
            ))}
        </dl>
      </EuiAccordion>
    </section>
  );
};
