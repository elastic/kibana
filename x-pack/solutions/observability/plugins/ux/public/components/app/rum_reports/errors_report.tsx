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
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import type { RumErrorsReport, RumReportErrorRow } from '../../../../common/rum_report';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { DeltaStat } from './delta_stat';
import { formatReportCount, formatReportRate } from './format';
import { SessionChips } from './session_chips';

const MiniTrend = ({ values }: { values: number[] }) => {
  const max = Math.max(1, ...values);
  return (
    <div
      css={css`
        display: flex;
        align-items: flex-end;
        gap: 1px;
        height: 24px;
        width: 72px;
      `}
    >
      {values.map((value, index) => (
        <div
          key={index}
          css={css`
            flex: 1;
            height: ${Math.max(value > 0 ? 2 : 0, Math.round((value / max) * 24))}px;
            background: currentColor;
            border-radius: 1px;
          `}
        />
      ))}
    </div>
  );
};

export function ErrorsReport({ report }: { report: RumErrorsReport }) {
  const history = useHistory();
  const columns: Array<EuiBasicTableColumn<RumReportErrorRow>> = [
    {
      field: 'type',
      name: i18n.translate('xpack.ux.reports.errors.typeLabel', { defaultMessage: 'Type' }),
      width: '140px',
    },
    {
      field: 'message',
      name: i18n.translate('xpack.ux.reports.errors.messageLabel', { defaultMessage: 'Message' }),
      render: (message: string, group: RumReportErrorRow) => (
        <EuiLink
          data-test-subj="uxColumnsLink"
          onClick={() => pushRumPath(history, '/errors', { errorGroup: group.key })}
        >
          {message}
        </EuiLink>
      ),
    },
    {
      field: 'count',
      name: i18n.translate('xpack.ux.reports.errors.countLabel', { defaultMessage: 'Count' }),
      width: '80px',
    },
    {
      field: 'sessionCount',
      name: i18n.translate('xpack.ux.reports.errors.sessionsLabel', { defaultMessage: 'Sessions' }),
      width: '90px',
    },
    {
      field: 'userCount',
      name: i18n.translate('xpack.ux.reports.errors.usersLabel', { defaultMessage: 'Users' }),
      width: '80px',
    },
    {
      field: 'countDelta',
      name: i18n.translate('xpack.ux.reports.errors.deltaLabel', { defaultMessage: 'vs prev' }),
      width: '90px',
      render: (delta: RumReportErrorRow['countDelta']) =>
        delta.pct == null ? '—' : formatReportRate(delta.pct),
    },
    {
      field: 'trend',
      name: i18n.translate('xpack.ux.reports.errors.trendLabel', { defaultMessage: 'Trend' }),
      width: '90px',
      render: (trend: number[]) => <MiniTrend values={trend} />,
    },
  ];

  return (
    <div data-test-subj="uxReportErrors">
      <EuiFlexGroup className="uxRumReportKpis">
        <EuiFlexItem>
          <DeltaStat
            title={i18n.translate('xpack.ux.reports.errors.kpi.errorSessionsLabel', {
              defaultMessage: 'Error sessions',
            })}
            value={formatReportCount(report.kpis.errorSessions.current)}
            delta={report.kpis.errorSessions}
            invert
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DeltaStat
            title={i18n.translate('xpack.ux.reports.errors.kpi.errorRateLabel', {
              defaultMessage: 'Error rate',
            })}
            value={formatReportRate(report.kpis.errorRate.current)}
            delta={report.kpis.errorRate}
            invert
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DeltaStat
            title={i18n.translate('xpack.ux.reports.errors.kpi.groupsLabel', {
              defaultMessage: 'Distinct groups',
            })}
            value={formatReportCount(report.kpis.distinctGroups.current)}
            delta={report.kpis.distinctGroups}
            invert
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DeltaStat
            title={i18n.translate('xpack.ux.reports.errors.kpi.usersLabel', {
              defaultMessage: 'Identified users',
            })}
            value={formatReportCount(report.kpis.identifiedUsers.current)}
            delta={report.kpis.identifiedUsers}
            invert
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.reports.errors.groupsTitle', {
                  defaultMessage: 'Error groups',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="uxRumReportNoPrint">
            <EuiLink
              data-test-subj="uxErrorsReportViewAllInErrorsLink"
              onClick={() => pushRumPath(history, '/errors')}
            >
              {i18n.translate('xpack.ux.reports.errors.viewAllLinkText', {
                defaultMessage: 'View all in Errors',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.ux.reports.errors.groupsCaption', {
            defaultMessage: 'Error groups',
          })}
          items={report.groups}
          columns={columns}
        />
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.reports.errors.samplesTitle', {
              defaultMessage: 'Sessions for the top group',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <SessionChips sessions={report.sampleSessions} />
        {report.topGroupKey && (
          <div className="uxRumReportNoPrint">
            <EuiSpacer size="s" />
            <EuiLink
              data-test-subj="uxErrorsReportViewInSessionsLink"
              onClick={() =>
                pushRumPath(
                  history,
                  '/session-replay',
                  sessionsPatch({ errorGroup: report.topGroupKey ?? undefined })
                )
              }
            >
              {i18n.translate('xpack.ux.reports.errors.viewSessionsLinkText', {
                defaultMessage: 'View in Sessions',
              })}
            </EuiLink>
          </div>
        )}
      </EuiPanel>
    </div>
  );
}
