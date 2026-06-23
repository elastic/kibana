/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import type { Criteria } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import type { HttpSetup } from '@kbn/core/public';
import { useCasesStats } from '../../hooks/use_cases_stats';
import type { CaseItem } from '../../hooks/use_cases_stats';
import { useCaptureTiming } from '../../hooks/use_capture_timing';
import { useCaptureConfig } from '../../hooks/use_capture_config';
import errorSentryLogo from './error_sentry.png';

export const Overview = ({
  http,
  onRunCapture,
  isRunningCapture,
  isPolling,
  isSetupComplete,
}: {
  http: HttpSetup;
  onRunCapture: () => void;
  isRunningCapture: boolean;
  isPolling: boolean;
  isSetupComplete: boolean;
}) => {
  const { isLoading, stats, refetch } = useCasesStats(http, isPolling);
  const { lastRun, nextRun } = useCaptureTiming(http, isPolling);
  const { index } = useCaptureConfig(http);

  const [sort, setSort] = useState<{ field: keyof CaseItem; direction: 'asc' | 'desc' }>({
    field: 'createdAt',
    direction: 'desc',
  });

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

  const columns = buildColumns(http, isPolling);

  return (
    <EuiPanel hasShadow={false} hasBorder={false} paddingSize="s">
      {isSetupComplete && (
        <>
          <EuiCallOut
            announceOnMount
            color="primary"
            iconType="checkCircleFill"
            title={i18n.translate('xpack.errorSentry.cases.nowRunning', {
              defaultMessage: 'Error Sentry is set up and running.',
            })}
          >
            <EuiFlexGroup gutterSize="m" alignItems="center" direction="row" responsive={false}>
              <EuiFlexItem grow css={{ flexDirection: 'row', gap: 4 }}>
                <FormattedMessage
                  id="xpack.errorSentry.cases.indexToCheck"
                  defaultMessage="Checking {index} every 24 hours.{nextRunClause}"
                  values={{
                    index: <strong>{index}</strong>,
                    nextRunClause: nextRun ? (
                      <>
                        {' '}
                        <FormattedMessage
                          id="xpack.errorSentry.cases.nextRunClause"
                          defaultMessage="Next run: {date} at {time}."
                          values={{
                            date: (
                              <FormattedDate
                                value={nextRun}
                                year="numeric"
                                month="short"
                                day="numeric"
                              />
                            ),
                            time: <FormattedTime value={nextRun} />,
                          }}
                        />
                      </>
                    ) : null,
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  iconType="play"
                  onClick={onRunCapture}
                  isLoading={isRunningCapture || isPolling}
                  data-test-subj="errorSentryRunCapture"
                >
                  <FormattedMessage
                    id="xpack.errorSentry.overview.runNow"
                    defaultMessage="Run now"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiCallOut>
          <EuiProgress
            size="xs"
            color={isRunningCapture || isPolling ? 'accent' : 'primary'}
            css={css`
              opacity: ${isRunningCapture || isPolling ? '1' : '0.2'};
              &::before {
                animation-duration: ${isRunningCapture || isPolling ? '2s' : '6s'};
                animation-direction: ${isRunningCapture || isPolling ? 'normal' : 'alternate'};
              }
            `}
          />
        </>
      )}

      <EuiSpacer size="m" />

      {stats.recentCases.length > 1 && (
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
              title={stats.investigated}
              description={i18n.translate('xpack.errorSentry.cases.stat.investigated', {
                defaultMessage: 'Investigated',
              })}
              titleColor="accent"
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
      )}

      {stats.recentCases.length === 0 && (
        <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l">
          <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="m">
            <EuiFlexItem css={{ textAlign: 'right' }}>
              <EuiTitle>
                <h2>
                  {i18n.translate('xpack.errorSentry.overview.h2.nothingToShowYetLabel', {
                    defaultMessage: 'Nothing to show yet',
                  })}
                </h2>
              </EuiTitle>
              <EuiText>
                {i18n.translate('xpack.errorSentry.overview.ifIssuesAreFoundTextLabel', {
                  defaultMessage: 'If issues are found, they will show up here.',
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <img
                src={errorSentryLogo}
                alt="logo"
                width="300"
                style={{ alignSelf: 'center', opacity: 0.2 }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      )}

      {stats.recentCases.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiInMemoryTable<CaseItem>
            tableCaption="list of cases"
            items={stats.recentCases}
            itemId="id"
            columns={columns}
            tableLayout="auto"
            sorting={{ sort }}
            onChange={(criteria: Criteria<CaseItem>) => {
              if (criteria.sort) {
                setSort({
                  field: criteria.sort.field as keyof CaseItem,
                  direction: criteria.sort.direction,
                });
              }
            }}
          />
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

const SEVERITY_ORDER: Record<CaseItem['severity'], number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const SEVERITY_COLOR: Record<CaseItem['severity'], string> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const VOLUME_ORDER: Record<NonNullable<CaseItem['volume']>, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const VOLUME_COLOR: Record<NonNullable<CaseItem['volume']>, string> = {
  low: 'default',
  medium: 'primary',
  high: 'warning',
};

const buildColumns = (http: HttpSetup, isPolling: boolean) => [
  {
    field: 'status' as const,
    name: '',
    width: '28px',
    sortable: true,
    render: (status: CaseItem['status']) => <EuiHealth color={statusColor(status)} />,
  },
  {
    field: 'title' as const,
    name: i18n.translate('xpack.errorSentry.cases.col.case', { defaultMessage: 'Case' }),
    sortable: false,
    render: (title: string, c: CaseItem) => (
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem>
          <EuiLink href={caseUrl(http.basePath, c.id)} data-test-subj={`errorSentryCase-${c.id}`}>
            {title}
          </EuiLink>
        </EuiFlexItem>
        <EuiFlexItem>
          {c.investigationSummary && (
            <EuiText size="xs" color="subdued" style={{ marginTop: 2 }}>
              {c.investigationSummary}
            </EuiText>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    field: 'severity' as const,
    name: i18n.translate('xpack.errorSentry.cases.col.severity', { defaultMessage: 'Severity' }),
    width: '100px',
    sortable: (c: CaseItem) => (c.investigated ? SEVERITY_ORDER[c.severity] : -1),
    render: (severity: CaseItem['severity'], c: CaseItem) =>
      c.investigated ? <EuiBadge color={SEVERITY_COLOR[severity]}>{severity}</EuiBadge> : null,
  },
  {
    field: 'volume' as const,
    name: i18n.translate('xpack.errorSentry.cases.col.volume', { defaultMessage: 'Volume' }),
    width: '100px',
    sortable: (c: CaseItem) => (c.volume ? VOLUME_ORDER[c.volume] : -1),
    render: (volume: CaseItem['volume']) =>
      volume ? <EuiBadge color={VOLUME_COLOR[volume]}>{volume}</EuiBadge> : null,
  },
  {
    field: 'createdAt' as const,
    name: i18n.translate('xpack.errorSentry.cases.col.created', { defaultMessage: 'Created' }),
    width: '120px',
    sortable: true,
    render: (createdAt: string) => (
      <EuiText size="s">
        <FormattedDate value={createdAt} year="numeric" month="short" day="numeric" />
      </EuiText>
    ),
  },
  {
    field: 'investigated' as const,
    name: '',
    width: '130px',
    sortable: false,
    render: (_investigated: boolean, c: CaseItem) => {
      if (isPolling && !c.investigated) {
        return (
          <EuiBadge color="warning">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <EuiLoadingSpinner size="s" />
              <FormattedMessage
                id="xpack.errorSentry.cases.investigating"
                defaultMessage="Investigating"
              />
            </span>
          </EuiBadge>
        );
      }
      if (c.investigated) {
        return (
          <EuiBadge color="accent" iconType="discuss">
            <FormattedMessage
              id="xpack.errorSentry.cases.investigated"
              defaultMessage="Investigated"
            />
          </EuiBadge>
        );
      }
      return null;
    },
  },
];

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

const caseUrl = (basePath: HttpSetup['basePath'], caseId: string) =>
  basePath.prepend(`/app/observability/cases/${caseId}`);
