/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { EvidenceSummaryStatus } from './use_evidence_summary';

export function EvidenceAnalystPanel({
  status,
  markdown,
  error,
  fileIssue,
}: {
  status: EvidenceSummaryStatus;
  markdown: string;
  error: string | null;
  fileIssue: boolean;
}) {
  const { euiTheme } = useEuiTheme();
  const bodyCss = css`
    height: ${euiTheme.base * 13}px;
    overflow: auto;
    padding-right: ${euiTheme.size.xs};

    .euiMarkdownFormat > *:first-child {
      margin-top: 0;
    }

    .euiMarkdownFormat > *:last-child {
      margin-bottom: 0;
    }

    .euiMarkdownFormat h1,
    .euiMarkdownFormat h2,
    .euiMarkdownFormat h3,
    .euiMarkdownFormat h4 {
      font-size: 1em;
      line-height: 1.3;
      margin: 0 0 ${euiTheme.size.xs};
    }

    .euiMarkdownFormat p,
    .euiMarkdownFormat ul,
    .euiMarkdownFormat ol {
      margin-bottom: ${euiTheme.size.xs};
    }

    .euiMarkdownFormat li {
      margin-bottom: 0;
    }
  `;

  if (status === 'idle') {
    return null;
  }

  if (status === 'unavailable') {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        iconType="sparkles"
        title={i18n.translate('xpack.ux.evidence.summaryUnavailableTitle', {
          defaultMessage: 'Analyst summary needs a GenAI connector',
        })}
      >
        <p>
          {i18n.translate('xpack.ux.evidence.summaryUnavailableDescription', {
            defaultMessage:
              'File GitHub issue waits for a summary so the ticket has a concrete finding. Set a default connector in GenAI Settings.',
          })}
        </p>
      </EuiCallOut>
    );
  }

  if (status === 'error') {
    return (
      <EuiCallOut
        announceOnMount
        color="warning"
        size="s"
        title={i18n.translate('xpack.ux.evidence.summaryErrorTitle', {
          defaultMessage: 'Could not summarize this pack',
        })}
      >
        <p>
          {error && error !== 'empty'
            ? error
            : i18n.translate('xpack.ux.evidence.summaryEmptyErrorMessage', {
                defaultMessage: 'The model returned no text. Continue in Analyst or try again.',
              })}
        </p>
      </EuiCallOut>
    );
  }

  return (
    <EuiPanel hasBorder paddingSize="s" data-test-subj="uxEvidenceAnalystSummary">
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        {status === 'streaming' ? (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <EuiText size="xs">
            <strong>
              {status === 'streaming'
                ? i18n.translate('xpack.ux.evidence.summaryStreamingTitle', {
                    defaultMessage: 'Analyst is summarizing…',
                  })
                : i18n.translate('xpack.ux.evidence.summaryDoneTitle', {
                    defaultMessage: 'Analyst summary',
                  })}
            </strong>
          </EuiText>
        </EuiFlexItem>
        {status === 'done' && fileIssue ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning" data-test-subj="uxEvidenceIssueSuggestedBadge">
              {i18n.translate('xpack.ux.evidence.summaryIssueSuggestedBadge', {
                defaultMessage: 'Issue suggested',
              })}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <div css={bodyCss}>
        {markdown ? (
          <EuiMarkdownFormat textSize="s">{markdown}</EuiMarkdownFormat>
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.ux.evidence.summaryWaitingDescription', {
              defaultMessage: 'Reading pages, errors, and sessions from this range.',
            })}
          </EuiText>
        )}
        {status === 'done' && !fileIssue ? (
          <>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.ux.evidence.summaryNoIssueDescription', {
                defaultMessage:
                  'Nothing concrete enough to file. Continue in Analyst if you want a deeper look.',
              })}
            </EuiText>
          </>
        ) : null}
      </div>
    </EuiPanel>
  );
}
