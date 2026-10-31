/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import type {
  RumReportErrorRow,
  RumReportPageRow,
  RumScorecardReport,
} from '../../../../common/rum_report';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { VITAL_P75_HELP } from '../../../utils/vital_help';
import { VitalColumnName, VitalHelpLabel } from '../../../utils/vital_help_label';
import { TrendMetric } from '../rum_overview/trend_metric';
import { DeltaStat } from './delta_stat';
import { formatReportCount, formatReportMs, formatReportRate } from './format';
import { RankChips } from './rank_chips';
import { SessionChips } from './session_chips';
import { CountriesReportPanel } from './countries_report';

export function ScorecardReport({ report }: { report: RumScorecardReport }) {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();

  const pageColumns: Array<EuiBasicTableColumn<RumReportPageRow>> = [
    {
      field: 'path',
      name: i18n.translate('xpack.ux.reports.scorecard.pages.pathLabel', {
        defaultMessage: 'Page',
      }),
      render: (path: string) => (
        <EuiLink
          data-test-subj={`uxReportPage-${path}`}
          onClick={() => pushRumPath(history, '/pages', { pageUrl: path })}
        >
          {path}
        </EuiLink>
      ),
    },
    {
      field: 'views',
      name: i18n.translate('xpack.ux.reports.scorecard.pages.viewsLabel', {
        defaultMessage: 'Views',
      }),
      width: '80px',
    },
    {
      field: 'p75Lcp',
      name: (
        <VitalColumnName
          label={i18n.translate('xpack.ux.reports.scorecard.pages.lcpLabel', {
            defaultMessage: 'LCP p75',
          })}
          tooltip={VITAL_P75_HELP.lcp}
        />
      ),
      width: '110px',
      render: (value: number | null) => formatReportMs(value),
    },
    {
      field: 'p75Inp',
      name: (
        <VitalColumnName
          label={i18n.translate('xpack.ux.reports.scorecard.pages.inpLabel', {
            defaultMessage: 'INP p75',
          })}
          tooltip={VITAL_P75_HELP.inp}
        />
      ),
      width: '110px',
      render: (value: number | null) => formatReportMs(value),
    },
    {
      field: 'p75Cls',
      name: (
        <VitalColumnName
          label={i18n.translate('xpack.ux.reports.scorecard.pages.clsLabel', {
            defaultMessage: 'CLS p75',
          })}
          tooltip={VITAL_P75_HELP.cls}
        />
      ),
      width: '90px',
      render: (value: number | null) => (value == null ? '—' : value.toFixed(3)),
    },
    {
      field: 'errorCount',
      name: i18n.translate('xpack.ux.reports.scorecard.pages.errorsLabel', {
        defaultMessage: 'Errors',
      }),
      width: '80px',
    },
  ];

  const errorColumns: Array<EuiBasicTableColumn<RumReportErrorRow>> = [
    {
      field: 'type',
      name: i18n.translate('xpack.ux.reports.scorecard.errors.typeLabel', {
        defaultMessage: 'Type',
      }),
      width: '140px',
    },
    {
      field: 'message',
      name: i18n.translate('xpack.ux.reports.scorecard.errors.messageLabel', {
        defaultMessage: 'Message',
      }),
      render: (message: string, group: RumReportErrorRow) => (
        <EuiLink
          data-test-subj={`uxReportError-${group.key}`}
          onClick={() => pushRumPath(history, '/errors', { errorGroup: group.key })}
        >
          {message}
        </EuiLink>
      ),
    },
    {
      field: 'count',
      name: i18n.translate('xpack.ux.reports.scorecard.errors.countLabel', {
        defaultMessage: 'Count',
      }),
      width: '80px',
    },
    {
      field: 'sessionCount',
      name: i18n.translate('xpack.ux.reports.scorecard.errors.sessionsLabel', {
        defaultMessage: 'Sessions',
      }),
      width: '90px',
    },
    {
      field: 'userCount',
      name: i18n.translate('xpack.ux.reports.scorecard.errors.usersLabel', {
        defaultMessage: 'Users',
      }),
      width: '80px',
    },
  ];

  return (
    <div data-test-subj="uxReportScorecard">
      <EuiFlexGroup className="uxRumReportKpis">
        <EuiFlexItem>
          <DeltaStat
            data-test-subj="uxReportKpiSessions"
            title={i18n.translate('xpack.ux.reports.scorecard.kpi.sessionsLabel', {
              defaultMessage: 'Sessions',
            })}
            value={formatReportCount(report.kpis.sessions.current)}
            delta={report.kpis.sessions}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DeltaStat
            title={i18n.translate('xpack.ux.reports.scorecard.kpi.pageViewsLabel', {
              defaultMessage: 'Page views',
            })}
            value={formatReportCount(report.kpis.pageViews.current)}
            delta={report.kpis.pageViews}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DeltaStat
            title={i18n.translate('xpack.ux.reports.scorecard.kpi.errorRateLabel', {
              defaultMessage: 'Error rate',
            })}
            value={formatReportRate(report.kpis.errorRate.current)}
            delta={report.kpis.errorRate}
            invert
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DeltaStat
            title={
              <VitalHelpLabel
                label={i18n.translate('xpack.ux.reports.scorecard.kpi.loadLabel', {
                  defaultMessage: 'p75 load',
                })}
                tooltip={VITAL_P75_HELP.load}
              />
            }
            value={formatReportMs(report.kpis.p75LoadMs.current)}
            delta={report.kpis.p75LoadMs}
            invert
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DeltaStat
            title={
              <VitalHelpLabel
                label={i18n.translate('xpack.ux.reports.scorecard.kpi.inpLabel', {
                  defaultMessage: 'p75 INP',
                })}
                tooltip={VITAL_P75_HELP.inp}
              />
            }
            value={formatReportMs(report.kpis.p75Inp.current)}
            delta={report.kpis.p75Inp}
            invert
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.reports.scorecard.cwvTitle', {
                  defaultMessage: 'Core Web Vitals',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup>
              <EuiFlexItem>
                <RankChips
                  name="LCP"
                  tooltip={VITAL_P75_HELP.lcp}
                  p75={report.vitals.lcp.p75}
                  ranks={report.vitals.lcp.ranks}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <RankChips
                  name="INP"
                  tooltip={VITAL_P75_HELP.inp}
                  p75={report.vitals.inp.p75}
                  ranks={report.vitals.inp.ranks}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <RankChips
                  name="CLS"
                  tooltip={VITAL_P75_HELP.cls}
                  p75={report.vitals.cls.p75}
                  ranks={report.vitals.cls.ranks}
                  unit="score"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <TrendMetric
              id="report-sessions"
              label={i18n.translate('xpack.ux.reports.scorecard.trendSessionsLabel', {
                defaultMessage: 'Sessions',
              })}
              points={report.trends}
              accessor="sessions"
              color={euiTheme.colors.vis.euiColorVis0}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer />

      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.reports.scorecard.frustrationTitle', {
              defaultMessage: 'Frustration',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiLink
              data-test-subj="uxScorecardReportLink"
              onClick={() =>
                pushRumPath(history, '/session-replay', sessionsPatch({ frustration: 'rage' }))
              }
            >
              <EuiStat
                title={String(report.frustration.rageSessions)}
                description={i18n.translate('xpack.ux.reports.scorecard.rageLabel', {
                  defaultMessage: 'Rage-click sessions',
                })}
                titleSize="s"
              />
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiLink
              data-test-subj="uxScorecardReportLink"
              onClick={() =>
                pushRumPath(history, '/session-replay', sessionsPatch({ frustration: 'dead' }))
              }
            >
              <EuiStat
                title={String(report.frustration.deadClickSessions)}
                description={i18n.translate('xpack.ux.reports.scorecard.deadLabel', {
                  defaultMessage: 'Dead-click sessions',
                })}
                titleSize="s"
              />
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiLink
              data-test-subj="uxScorecardReportLink"
              onClick={() =>
                pushRumPath(history, '/session-replay', sessionsPatch({ frustration: 'error' }))
              }
            >
              <EuiStat
                title={String(report.frustration.errorSessions)}
                description={i18n.translate('xpack.ux.reports.scorecard.errorSessionsLabel', {
                  defaultMessage: 'Error sessions',
                })}
                titleSize="s"
              />
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer />

      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.reports.scorecard.topPagesTitle', {
                  defaultMessage: 'Top pages',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="uxRumReportNoPrint">
            <EuiLink
              data-test-subj="uxScorecardReportViewAllInPagesLink"
              onClick={() => pushRumPath(history, '/pages')}
            >
              {i18n.translate('xpack.ux.reports.scorecard.viewPagesLinkText', {
                defaultMessage: 'View all in Pages',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.ux.reports.scorecard.topPagesCaption', {
            defaultMessage: 'Top pages',
          })}
          items={report.topPages}
          columns={pageColumns}
        />
      </EuiPanel>

      <EuiSpacer />

      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.reports.scorecard.topErrorsTitle', {
                  defaultMessage: 'Top error groups',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="uxRumReportNoPrint">
            <EuiLink
              data-test-subj="uxScorecardReportViewAllInErrorsLink"
              onClick={() => pushRumPath(history, '/errors')}
            >
              {i18n.translate('xpack.ux.reports.scorecard.viewErrorsLinkText', {
                defaultMessage: 'View all in Errors',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.ux.reports.scorecard.topErrorsCaption', {
            defaultMessage: 'Top error groups',
          })}
          items={report.errorGroups}
          columns={errorColumns}
        />
      </EuiPanel>

      <EuiSpacer />

      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.reports.scorecard.sessionsTitle', {
              defaultMessage: 'Sample sessions',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <SessionChips sessions={report.sampleSessions} />
      </EuiPanel>

      <EuiSpacer />

      <CountriesReportPanel countries={report.countries} />

      <EuiSpacer />

      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.reports.scorecard.clientsTitle', {
              defaultMessage: 'Browsers & OS',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup>
          <EuiFlexItem>
            {report.browsers.slice(0, 3).map((bucket) => (
              <div key={bucket.key}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">{bucket.key}</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiProgress
                      value={bucket.count}
                      max={Math.max(1, report.kpis.sessions.current ?? 1)}
                      size="s"
                      color="primary"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">{bucket.count}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
              </div>
            ))}
          </EuiFlexItem>
          <EuiFlexItem>
            {report.os.slice(0, 3).map((bucket) => (
              <div key={bucket.key}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">{bucket.key}</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiProgress
                      value={bucket.count}
                      max={Math.max(1, report.kpis.sessions.current ?? 1)}
                      size="s"
                      color="accent"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">{bucket.count}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="xs" />
              </div>
            ))}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
}
