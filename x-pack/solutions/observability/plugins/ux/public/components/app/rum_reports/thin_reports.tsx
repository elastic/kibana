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
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import type {
  RumClientsReport,
  RumFrustrationReport,
  RumFunnelReport,
  RumReportClientCell,
  RumReportUserRow,
  RumUsersReport,
} from '../../../../common/rum_report';
import type { FrictionPattern } from '../../../../common/session_patterns';
import type { FunnelStepStats } from '../../../../common/session_funnel';
import { pushRumPath, sessionsPatch } from '../../../utils/rum_search';
import { DeltaStat } from './delta_stat';
import { formatReportCount, formatReportDate, formatReportRate } from './format';
import { SessionChips } from './session_chips';
import { CountriesReportPanel } from './countries_report';

export function FrustrationReport({ report }: { report: RumFrustrationReport }) {
  const history = useHistory();
  const columns: Array<EuiBasicTableColumn<FrictionPattern>> = [
    {
      field: 'kind',
      name: i18n.translate('xpack.ux.reports.frustration.kindLabel', { defaultMessage: 'Kind' }),
      width: '100px',
    },
    {
      field: 'step',
      name: i18n.translate('xpack.ux.reports.frustration.stepLabel', { defaultMessage: 'Step' }),
    },
    {
      field: 'sessionCount',
      name: i18n.translate('xpack.ux.reports.frustration.sessionsLabel', {
        defaultMessage: 'Sessions',
      }),
      width: '100px',
    },
    {
      field: 'share',
      name: i18n.translate('xpack.ux.reports.frustration.shareLabel', { defaultMessage: 'Share' }),
      width: '90px',
      render: (share: number) => formatReportRate(share),
    },
  ];

  return (
    <div data-test-subj="uxReportFrustration">
      <EuiFlexGroup className="uxRumReportKpis">
        <EuiFlexItem>
          <DeltaStat
            title={i18n.translate('xpack.ux.reports.frustration.kpi.rageLabel', {
              defaultMessage: 'Rage-click sessions',
            })}
            value={formatReportCount(report.kpis.rageSessions.current)}
            delta={report.kpis.rageSessions}
            invert
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DeltaStat
            title={i18n.translate('xpack.ux.reports.frustration.kpi.deadLabel', {
              defaultMessage: 'Dead-click sessions',
            })}
            value={formatReportCount(report.kpis.deadClickSessions.current)}
            delta={report.kpis.deadClickSessions}
            invert
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DeltaStat
            title={i18n.translate('xpack.ux.reports.frustration.kpi.errorsLabel', {
              defaultMessage: 'Error sessions',
            })}
            value={formatReportCount(report.kpis.errorSessions.current)}
            delta={report.kpis.errorSessions}
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
                {i18n.translate('xpack.ux.reports.frustration.frictionTitle', {
                  defaultMessage: 'Friction by step',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="uxRumReportNoPrint">
            <EuiLink
              data-test-subj="uxFrustrationReportOpenJourneysLink"
              onClick={() => pushRumPath(history, '/journeys')}
            >
              {i18n.translate('xpack.ux.reports.frustration.viewJourneysLinkText', {
                defaultMessage: 'Open Journeys',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.ux.reports.frustration.frictionCaption', {
            defaultMessage: 'Friction by step',
          })}
          items={report.friction}
          columns={columns}
        />
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.reports.frustration.samplesTitle', {
              defaultMessage: 'Rage-click sessions',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <SessionChips sessions={report.sampleSessions} />
      </EuiPanel>
    </div>
  );
}

export function FunnelReport({ report }: { report: RumFunnelReport }) {
  const history = useHistory();
  const columns: Array<EuiBasicTableColumn<FunnelStepStats>> = [
    {
      field: 'label',
      name: i18n.translate('xpack.ux.reports.funnel.stepLabel', { defaultMessage: 'Step' }),
    },
    {
      field: 'count',
      name: i18n.translate('xpack.ux.reports.funnel.countLabel', { defaultMessage: 'Sessions' }),
      width: '100px',
    },
    {
      field: 'conversionFromStart',
      name: i18n.translate('xpack.ux.reports.funnel.conversionLabel', {
        defaultMessage: 'Conversion',
      }),
      width: '120px',
      render: (value: number) => formatReportRate(value),
    },
    {
      field: 'dropOffCount',
      name: i18n.translate('xpack.ux.reports.funnel.dropOffLabel', { defaultMessage: 'Drop-off' }),
      width: '100px',
    },
  ];

  return (
    <div data-test-subj="uxReportFunnel">
      <EuiFlexGroup className="uxRumReportKpis">
        <EuiFlexItem>
          <DeltaStat
            title={i18n.translate('xpack.ux.reports.funnel.kpi.conversionLabel', {
              defaultMessage: 'Conversion',
            })}
            value={formatReportRate(report.kpis.conversion.current)}
            delta={report.kpis.conversion}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <DeltaStat
            title={i18n.translate('xpack.ux.reports.funnel.kpi.sessionsLabel', {
              defaultMessage: 'Sessions considered',
            })}
            value={formatReportCount(report.kpis.sessionsConsidered.current)}
            delta={report.kpis.sessionsConsidered}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiPanel hasBorder paddingSize="m">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.reports.funnel.stepsTitle', {
                  defaultMessage: 'Funnel steps',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false} className="uxRumReportNoPrint">
            <EuiLink
              data-test-subj="uxFunnelReportOpenJourneysLink"
              onClick={() => pushRumPath(history, '/journeys')}
            >
              {i18n.translate('xpack.ux.reports.funnel.viewJourneysLinkText', {
                defaultMessage: 'Open Journeys',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {report.steps.map((step) => (
          <div key={`${step.type}-${step.value}`}>
            <EuiText size="s">
              {step.label} ({formatReportRate(step.conversionFromStart)})
            </EuiText>
            <EuiProgress value={step.conversionFromStart} max={1} size="s" />
            <EuiSpacer size="s" />
          </div>
        ))}
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.ux.reports.funnel.stepsCaption', {
            defaultMessage: 'Funnel steps',
          })}
          items={report.steps}
          columns={columns}
        />
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.reports.funnel.dropOffTitle', {
              defaultMessage: 'Drop-off sessions',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <SessionChips sessions={report.sampleSessions} />
      </EuiPanel>
    </div>
  );
}

export function ClientsReport({ report }: { report: RumClientsReport }) {
  const history = useHistory();
  const maxBrowser = Math.max(1, ...report.browsers.map((bucket) => bucket.count));
  const columns: Array<EuiBasicTableColumn<RumReportClientCell>> = [
    {
      field: 'browser',
      name: i18n.translate('xpack.ux.reports.clients.browserLabel', { defaultMessage: 'Browser' }),
    },
    {
      field: 'os',
      name: i18n.translate('xpack.ux.reports.clients.osLabel', { defaultMessage: 'OS' }),
    },
    {
      field: 'sessions',
      name: i18n.translate('xpack.ux.reports.clients.sessionsLabel', {
        defaultMessage: 'Sessions',
      }),
      width: '100px',
    },
    {
      field: 'errorSessions',
      name: i18n.translate('xpack.ux.reports.clients.errorsLabel', {
        defaultMessage: 'Error sessions',
      }),
      width: '130px',
    },
  ];

  return (
    <div data-test-subj="uxReportClients">
      <EuiFlexGroup className="uxRumReportKpis">
        <EuiFlexItem>
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.ux.reports.clients.mobileTitle', {
                  defaultMessage: 'Mobile vs desktop',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">
              {i18n.translate('xpack.ux.reports.clients.mobileDesktopLabel', {
                defaultMessage: '{mobile} mobile · {desktop} desktop',
                values: { mobile: report.mobileSessions, desktop: report.desktopSessions },
              })}
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <CountriesReportPanel countries={report.countries} />
      <EuiSpacer />
      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.reports.clients.browsersTitle', {
              defaultMessage: 'Browsers',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {report.browsers.map((bucket) => (
          <div key={bucket.key}>
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLink
                  data-test-subj="uxClientsReportLink"
                  className="uxRumReportNoPrint"
                  onClick={() =>
                    pushRumPath(history, '/session-replay', sessionsPatch({ browser: bucket.key }))
                  }
                >
                  {bucket.key}
                </EuiLink>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiProgress value={bucket.count} max={maxBrowser} size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{bucket.count}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="xs" />
          </div>
        ))}
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.reports.clients.nestedTitle', {
              defaultMessage: 'Browser × OS',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.ux.reports.clients.nestedCaption', {
            defaultMessage: 'Browser and OS mix',
          })}
          items={report.nested}
          columns={columns}
        />
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.reports.clients.samplesTitle', {
              defaultMessage: 'Sample sessions',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <SessionChips sessions={report.sampleSessions} />
      </EuiPanel>
    </div>
  );
}

export function UsersReport({ report }: { report: RumUsersReport }) {
  const history = useHistory();
  const columns: Array<EuiBasicTableColumn<RumReportUserRow>> = [
    {
      field: 'displayUser',
      name: i18n.translate('xpack.ux.reports.users.nameLabel', { defaultMessage: 'User' }),
      render: (name: string, row: RumReportUserRow) => (
        <EuiLink
          data-test-subj={`uxReportUser-${row.key}`}
          onClick={() => pushRumPath(history, '/session-replay', sessionsPatch({ user: row.key }))}
        >
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'sessionCount',
      name: i18n.translate('xpack.ux.reports.users.sessionsLabel', { defaultMessage: 'Sessions' }),
      width: '100px',
    },
    {
      field: 'errorSessions',
      name: i18n.translate('xpack.ux.reports.users.errorsLabel', {
        defaultMessage: 'Error sessions',
      }),
      width: '130px',
    },
    {
      field: 'rageSessions',
      name: i18n.translate('xpack.ux.reports.users.rageLabel', { defaultMessage: 'Rage sessions' }),
      width: '120px',
    },
    {
      field: 'lastSeen',
      name: i18n.translate('xpack.ux.reports.users.lastSeenLabel', { defaultMessage: 'Last seen' }),
      render: (value: string | null) => formatReportDate(value),
    },
  ];
  if (report.users.some((row) => row.email)) {
    columns.splice(1, 0, {
      field: 'email',
      name: i18n.translate('xpack.ux.reports.users.emailLabel', { defaultMessage: 'Email' }),
    });
  }

  return (
    <div data-test-subj="uxReportUsers">
      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.reports.users.tableTitle', {
              defaultMessage: 'Identified users',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {report.identifiedCount === 0 ? (
          <EuiText>
            {i18n.translate('xpack.ux.reports.users.emptyDescription', {
              defaultMessage: 'No identified users in range. The SDK must call setUser.',
            })}
          </EuiText>
        ) : (
          <EuiBasicTable
            tableCaption={i18n.translate('xpack.ux.reports.users.tableCaption', {
              defaultMessage: 'Identified users',
            })}
            items={report.users}
            columns={columns}
          />
        )}
      </EuiPanel>
      <EuiSpacer />
      <EuiPanel hasBorder paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.ux.reports.users.samplesTitle', {
              defaultMessage: 'Sessions for the top user',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <SessionChips sessions={report.sampleSessions} />
      </EuiPanel>
    </div>
  );
}
