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
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import type { RumPagesReport, RumReportPageRow } from '../../../../common/rum_report';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { POOR_LCP_HELP, VITAL_P75_HELP } from '../../../utils/vital_help';
import { VitalColumnName, VitalHelpLabel } from '../../../utils/vital_help_label';
import { DeltaStat } from './delta_stat';
import { formatReportCount, formatReportMs, formatReportRate } from './format';
import { SessionChips } from './session_chips';

const pageColumns = (
  history: ReturnType<typeof useHistory>
): Array<EuiBasicTableColumn<RumReportPageRow>> => [
  {
    field: 'path',
    name: i18n.translate('xpack.ux.reports.pages.pathLabel', { defaultMessage: 'Page' }),
    render: (path: string) => (
      <EuiLink
        data-test-subj="uxPageColumnsLink"
        onClick={() => pushRumPath(history, '/pages', { pageUrl: path })}
      >
        {path}
      </EuiLink>
    ),
  },
  {
    field: 'views',
    name: i18n.translate('xpack.ux.reports.pages.viewsLabel', { defaultMessage: 'Views' }),
    width: '90px',
  },
  {
    field: 'p75Lcp',
    name: (
      <VitalColumnName
        label={i18n.translate('xpack.ux.reports.pages.lcpLabel', { defaultMessage: 'LCP p75' })}
        tooltip={VITAL_P75_HELP.lcp}
      />
    ),
    width: '120px',
    render: (value: number | null) => formatReportMs(value),
  },
  {
    field: 'p75Inp',
    name: (
      <VitalColumnName
        label={i18n.translate('xpack.ux.reports.pages.inpLabel', { defaultMessage: 'INP p75' })}
        tooltip={VITAL_P75_HELP.inp}
      />
    ),
    width: '120px',
    render: (value: number | null) => formatReportMs(value),
  },
  {
    field: 'p75Cls',
    name: (
      <VitalColumnName
        label={i18n.translate('xpack.ux.reports.pages.clsLabel', { defaultMessage: 'CLS p75' })}
        tooltip={VITAL_P75_HELP.cls}
      />
    ),
    width: '90px',
    render: (value: number | null) => (value == null ? '—' : value.toFixed(3)),
  },
  {
    field: 'errorCount',
    name: i18n.translate('xpack.ux.reports.pages.errorsLabel', { defaultMessage: 'Errors' }),
    width: '80px',
  },
];

export function PagesReport({ report }: { report: RumPagesReport }) {
  const history = useHistory();
  const columns = pageColumns(history);

  return (
    <div data-test-subj="uxReportPages">
      <EuiFlexGroup className="uxRumReportKpis">
        <EuiFlexItem>
          <DeltaStat
            title={i18n.translate('xpack.ux.reports.pages.kpi.viewsLabel', {
              defaultMessage: 'Page views',
            })}
            value={formatReportCount(report.kpis.pageViews.current)}
            delta={report.kpis.pageViews}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DeltaStat
            title={i18n.translate('xpack.ux.reports.pages.kpi.pathsLabel', {
              defaultMessage: 'Distinct paths',
            })}
            value={formatReportCount(report.kpis.distinctPaths.current)}
            delta={report.kpis.distinctPaths}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DeltaStat
            title={
              <VitalHelpLabel
                label={i18n.translate('xpack.ux.reports.pages.kpi.poorLcpLabel', {
                  defaultMessage: 'Pages with poor LCP',
                })}
                tooltip={POOR_LCP_HELP}
              />
            }
            value={formatReportRate(report.kpis.poorLcpPct.current)}
            delta={report.kpis.poorLcpPct}
            invert
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.reports.pages.mostViewedTitle', {
              defaultMessage: 'Most viewed',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.ux.reports.pages.mostViewedCaption', {
            defaultMessage: 'Most viewed pages',
          })}
          items={report.mostViewed}
          columns={columns}
        />
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.reports.pages.slowestTitle', {
              defaultMessage: 'Slowest by LCP p75',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.ux.reports.pages.slowestCaption', {
            defaultMessage: 'Slowest pages by LCP',
          })}
          items={report.slowest}
          columns={columns}
        />
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                {report.worstPath
                  ? i18n.translate('xpack.ux.reports.pages.samplesOnPathTitle', {
                      defaultMessage: 'Sample sessions on {path}',
                      values: { path: report.worstPath },
                    })
                  : i18n.translate('xpack.ux.reports.pages.samplesTitle', {
                      defaultMessage: 'Sample sessions',
                    })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          {report.worstPath && (
            <EuiFlexItem grow={false} className="uxRumReportNoPrint">
              <EuiLink
                data-test-subj="uxPagesReportViewInSessionsLink"
                onClick={() =>
                  pushRumPath(
                    history,
                    '/session-replay',
                    sessionsPatch({ pageUrl: report.worstPath! })
                  )
                }
              >
                {i18n.translate('xpack.ux.reports.pages.viewSessionsLinkText', {
                  defaultMessage: 'View in Sessions',
                })}
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <SessionChips sessions={report.sampleSessions} />
      </EuiPanel>
    </div>
  );
}
