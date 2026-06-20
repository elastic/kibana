/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import type { HttpSetup } from '@kbn/core/public';
import { useCasesStats } from '../hooks/use_cases_stats';
import type { CaseItem } from '../hooks/use_cases_stats';
import { useCaptureTiming } from '../hooks/use_capture_timing';

const statusColor = (status: CaseItem['status']): 'success' | 'warning' | 'subdued' => {
  switch (status) {
    case 'open':
      return 'warning';
    case 'in-progress':
      return 'success';
    case 'closed':
      return 'subdued';
  }
};

const statusLabel = (status: CaseItem['status']): string => {
  switch (status) {
    case 'open':
      return i18n.translate('xpack.errorSentry.cases.status.open', { defaultMessage: 'Open' });
    case 'in-progress':
      return i18n.translate('xpack.errorSentry.cases.status.inProgress', {
        defaultMessage: 'In progress',
      });
    case 'closed':
      return i18n.translate('xpack.errorSentry.cases.status.closed', {
        defaultMessage: 'Closed',
      });
  }
};

const caseUrl = (basePath: HttpSetup['basePath'], caseId: string) =>
  basePath.prepend(`/app/observability/cases/${caseId}`);

export const CasesStatsPanel = ({
  http,
  onRunCapture,
  isRunningCapture,
  isPolling,
}: {
  http: HttpSetup;
  onRunCapture: () => void;
  isRunningCapture: boolean;
  isPolling: boolean;
}) => {
  const { isLoading, stats, refetch } = useCasesStats(http, isPolling);
  const { lastRun, nextRun } = useCaptureTiming(http, isPolling);

  if (isLoading && !stats) {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.errorSentry.cases.panelTitle"
                defaultMessage="Issues Found"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiLink onClick={() => refetch()} data-test-subj="errorSentryCasesReload">
                <FormattedMessage id="xpack.errorSentry.cases.refresh" defaultMessage="Refresh" />
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="play"
                onClick={onRunCapture}
                isLoading={isRunningCapture}
                data-test-subj="errorSentryRunCapture"
              >
                <FormattedMessage id="xpack.errorSentry.overview.runNow" defaultMessage="Run now" />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup responsive={false}>
        <EuiFlexItem>
          <EuiStat
            title={stats.total}
            description={i18n.translate('xpack.errorSentry.cases.stat.total', {
              defaultMessage: 'Total',
            })}
            titleSize="m"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={stats.open}
            description={i18n.translate('xpack.errorSentry.cases.stat.open', {
              defaultMessage: 'Open',
            })}
            titleColor="warning"
            titleSize="m"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={stats.inProgress}
            description={i18n.translate('xpack.errorSentry.cases.stat.inProgress', {
              defaultMessage: 'In progress',
            })}
            titleColor="success"
            titleSize="m"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            title={stats.closed}
            description={i18n.translate('xpack.errorSentry.cases.stat.closed', {
              defaultMessage: 'Closed',
            })}
            titleColor="subdued"
            titleSize="m"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      {stats.recentCases.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.errorSentry.cases.recentTitle"
                defaultMessage="Recent cases"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          {stats.recentCases.map((c) => (
            <EuiFlexGroup
              key={c.id}
              alignItems="center"
              gutterSize="s"
              responsive={false}
              style={{ marginBottom: 6 }}
            >
              <EuiFlexItem grow={false}>
                <EuiHealth color={statusColor(c.status)} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiLink href={caseUrl(http.basePath, c.id)} data-test-subj={`errorSentryCase-${c.id}`}>
                  <EuiText size="s">{c.title}</EuiText>
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{statusLabel(c.status)}</EuiBadge>
              </EuiFlexItem>
              {c.commentCount > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiBadge color="accent" iconType="discuss">
                    <FormattedMessage
                      id="xpack.errorSentry.cases.investigated"
                      defaultMessage="Investigated"
                    />
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          ))}
        </>
      )}

      {(lastRun || nextRun) && (
        <>
          <EuiHorizontalRule margin="m" />
          <EuiFlexGroup gutterSize="xl" responsive={false}>
            {lastRun && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.errorSentry.cases.lastRun"
                    defaultMessage="Last run: {date} at {time}"
                    values={{
                      date: (
                        <FormattedDate value={lastRun} year="numeric" month="short" day="numeric" />
                      ),
                      time: <FormattedTime value={lastRun} />,
                    }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
            {nextRun && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="xpack.errorSentry.cases.nextRun"
                    defaultMessage="Next run: {date} at {time}"
                    values={{
                      date: (
                        <FormattedDate value={nextRun} year="numeric" month="short" day="numeric" />
                      ),
                      time: <FormattedTime value={nextRun} />,
                    }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
};
