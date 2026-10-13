/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { SerializedStyles } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { getNightshiftInvestigationPath } from '../../common/url_params';
import { useKibana } from '../../hooks/use_kibana';
import { SectionHeader } from '../flyouts/form/section_header';
import { RunStatusIndicator, type Run } from './run_history';

const labels = {
  automationRun: i18n.translate('xpack.nightshift.automations.detail.automationRun', {
    defaultMessage: 'Automation run',
  }),
  run: i18n.translate('xpack.nightshift.automations.detail.run', { defaultMessage: 'Run' }),
  skippedTrigger: i18n.translate('xpack.nightshift.automations.detail.skippedTrigger', {
    defaultMessage: 'Skipped trigger',
  }),
  investigation: i18n.translate('xpack.nightshift.automations.detail.openInvestigation', {
    defaultMessage: 'Open investigation',
  }),
  triggered: i18n.translate('xpack.nightshift.automations.detail.triggered', {
    defaultMessage: 'Triggered',
  }),
  source: i18n.translate('xpack.nightshift.automations.detail.source', {
    defaultMessage: 'Source',
  }),
  message: i18n.translate('xpack.nightshift.automations.detail.message', {
    defaultMessage: 'Message',
  }),
  reason: i18n.translate('xpack.nightshift.automations.detail.reason', {
    defaultMessage: 'Reason',
  }),
  started: i18n.translate('xpack.nightshift.automations.detail.started', {
    defaultMessage: 'Started',
  }),
  ended: i18n.translate('xpack.nightshift.automations.detail.ended', { defaultMessage: 'Ended' }),
  automation: i18n.translate('xpack.nightshift.automations.detail.automation', {
    defaultMessage: 'Automation',
  }),
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const formatStarted = (value: string) => `${formatDate(value)} (${moment(value).fromNow()})`;

const OpenInvestigationButton = ({ investigationId }: { investigationId: string }) => {
  const { application } = useKibana().services;
  return (
    <EuiButton
      size="s"
      data-test-subj="automationRunOpenInvestigation"
      href={application.getUrlForApp(NIGHTSHIFT_APP_ID, {
        path: getNightshiftInvestigationPath(investigationId),
      })}
    >
      {labels.investigation}
    </EuiButton>
  );
};

export const RunDetail = ({
  run,
  automationName,
  titleId,
  headerCss,
  bodyCss,
}: {
  run: Run;
  automationName: string;
  titleId: string;
  headerCss: SerializedStyles;
  bodyCss: SerializedStyles;
}) => (
  <>
    <header css={headerCss}>
      <EuiTitle size="s">
        <h2 id={titleId}>{run.title || labels.automationRun}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <RunStatusIndicator status={run.status} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            · {formatStarted(run.startedAt)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </header>
    <EuiFlyoutBody>
      <div css={bodyCss}>
        {run.status === 'skipped' ? (
          <>
            <SectionHeader title={labels.skippedTrigger} />
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              columnWidths={['auto', 1]}
              listItems={[
                {
                  title: labels.triggered,
                  description: formatStarted(run.startedAt),
                },
                { title: labels.source, description: run.triggeredBy ?? '—' },
                { title: labels.message, description: run.message ?? '—' },
                {
                  title: labels.reason,
                  description:
                    run.skipReason === 'daily_limit'
                      ? i18n.translate('xpack.nightshift.automations.detail.dailyLimitReason', {
                          defaultMessage:
                            'Daily trigger limit of {limit} was already reached, so this trigger did not start a run.',
                          values: { limit: run.dailyLimit ?? '—' },
                        })
                      : '—',
                },
                { title: labels.automation, description: automationName },
              ]}
            />
          </>
        ) : (
          <>
            <SectionHeader title={labels.run} />
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="column"
              columnWidths={['auto', 1]}
              listItems={[
                { title: labels.source, description: run.triggeredBy ?? '—' },
                { title: labels.message, description: run.message ?? '—' },
                {
                  title: labels.started,
                  description: formatStarted(run.startedAt),
                },
                {
                  title: labels.ended,
                  description: run.finishedAt ? formatDate(run.finishedAt) : '—',
                },
                { title: labels.automation, description: automationName },
              ]}
            />
            {run.investigationId && (
              <>
                <EuiHorizontalRule margin="m" />
                <OpenInvestigationButton investigationId={run.investigationId} />
              </>
            )}
          </>
        )}
      </div>
    </EuiFlyoutBody>
  </>
);
