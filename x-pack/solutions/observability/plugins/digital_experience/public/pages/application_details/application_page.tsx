/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useHistory } from 'react-router-dom';
import { EuiEmptyPrompt, EuiLoadingLogo, EuiPageSection } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import { APPLICATION_SOURCE, APPLICATION_TYPE } from '../../../common/application_source';
import {
  WEB_APPLICATION_TAB_IDS,
  type ApplicationSource,
  type ApplicationType,
  type ApplicationTabId,
  type WebApplicationTabId,
} from '../../../common/types/applications';
import { useRouteBreadcrumb } from '../../breadcrumbs/use_route_breadcrumb';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS } from '../../ebt_constants';
import { useApplicationLinks } from '../../hooks/use_application_links';
import { useApplicationsHref } from '../../hooks/use_applications_href';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { useQueryParam } from '../../hooks/use_query_param';
import { useShareAction } from '../../hooks/use_share_action';
import { useEnvironment } from '../../hooks/use_environment';
import { useTimeRange } from '../../hooks/use_time_range';
import { APPLICATIONS_LABEL, APPLICATION_TAB_LABELS, COMPARE_LABEL } from '../../labels';
import { ErrorsTab } from '../errors/errors_tab';
import { NetworkTab } from '../network/network_tab';
import { REPORT_TEMPLATES } from '../reports/report_templates';
import type { ReportTemplateId } from '../reports/report_templates';
import { ReportsTab } from '../reports/reports_tab';
import { ScorecardReport } from '../reports/scorecard/scorecard_report';
import { SessionsTab } from '../sessions/sessions_tab';
import { MobileApplicationPage } from './mobile_overview/mobile_application_page';
import { OtelOverview } from './otel_overview/otel_overview';

/**
 * Errors, network, sessions and reports are read from EDOT Browser data only; Classic RUM applications have
 * the ux plugin's dashboard as their Overview.
 */
const tabsOf = (source: ApplicationSource): readonly WebApplicationTabId[] =>
  source === APPLICATION_SOURCE.otel ? WEB_APPLICATION_TAB_IDS : ['overview'];

const isTabOf = (source: ApplicationSource, tab: ApplicationTabId): boolean =>
  tabsOf(source).some((id) => id === tab);
const sessionsUnavailablePrompt = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceSessionsUnavailable"
    iconType="users"
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.application.sessions.unavailableTitle', {
          defaultMessage: 'No sessions for Classic RUM applications',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.digitalExperience.application.sessions.unavailableDescription', {
          defaultMessage:
            'Sessions are built from EDOT Browser data. Instrument this application with EDOT Browser to see its sessions.',
        })}
      </p>
    }
  />
);

const overviewUnavailablePrompt = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceOverviewEmpty"
    iconType="package"
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.application.overview.empty.title', {
          defaultMessage: 'No overview available',
        })}
      </h2>
    }
    body={
      <p>
        {i18n.translate('xpack.digitalExperience.application.overview.empty.body', {
          defaultMessage: 'The Overview for this application could not be loaded.',
        })}
      </p>
    }
  />
);

// The loading state of Observability's pages, as APM shows while it loads an embedded dashboard.
const overviewLoadingPrompt = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceOverviewLoading"
    icon={<EuiLoadingLogo logo="logoObservability" size="xl" />}
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.application.overview.loading', {
          defaultMessage: 'Loading the Overview',
        })}
      </h2>
    }
  />
);

const withPagePadding = (content: ReactNode) => (
  <EuiPageSection paddingSize="m" restrictWidth={false}>
    {content}
  </EuiPageSection>
);

/** The ux plugin's Classic RUM dashboard, which pads itself, or a prompt when it can't show. */
function ClassicRumOverview({ serviceName }: { serviceName: string }) {
  const { ux } = useKibanaServices();
  const { timeRange, setTimeRange } = useTimeRange();
  const { environment } = useEnvironment();

  // Wrapped in an object: a component is a function, which React state would call as an updater.
  const { value: dashboard, error } = useAbortableAsync(
    async () => (ux ? { Component: await ux.getClassicRumDashboard() } : undefined),
    [ux]
  );

  if (dashboard) {
    return (
      <dashboard.Component
        serviceName={serviceName}
        environment={environment}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />
    );
  }
  // Without ux (serverless) there is no Classic RUM dashboard to show.
  return withPagePadding(error || !ux ? overviewUnavailablePrompt : overviewLoadingPrompt);
}

/** An application's page: a mobile application's, or a web one's (EDOT Browser or Classic RUM). */
export function ApplicationPage({
  serviceName,
  source,
  applicationType,
  selectedTab,
  report,
}: {
  serviceName: string;
  source: ApplicationSource;
  /** Whether the application is a web or a mobile one; web when unset. */
  applicationType?: ApplicationType;
  selectedTab: ApplicationTabId;
  /** The report open on a web application's Reports tab; the template gallery when unset. */
  report?: ReportTemplateId;
}) {
  // Mobile applications are EDOT data: their type, not their source, gives them their own page.
  if (source === APPLICATION_SOURCE.otel && applicationType === APPLICATION_TYPE.mobile) {
    // A new one per application, so its badges, filter options and KPIs never show the previous
    // application's while the new one loads.
    return (
      <MobileApplicationPage
        key={serviceName}
        serviceName={serviceName}
        selectedTab={selectedTab}
      />
    );
  }
  return (
    <WebApplicationPage
      serviceName={serviceName}
      source={source}
      selectedTab={selectedTab}
      report={report}
    />
  );
}

/** A web application's page: the Overview of its source and, for EDOT Browser, its other tabs. */
function WebApplicationPage({
  serviceName,
  source,
  selectedTab,
  report,
}: {
  serviceName: string;
  source: ApplicationSource;
  selectedTab: ApplicationTabId;
  /** The report open on the Reports tab; the template gallery when unset. */
  report?: ReportTemplateId;
}) {
  const applicationsHref = useApplicationsHref();
  const history = useHistory();
  const {
    overviewHref,
    overviewPath,
    errorsHref,
    networkHref,
    reportsHref,
    scorecardReportHref,
    sessionsHref,
  } = useApplicationLinks(serviceName, source);
  const shareAction = useShareAction({ serviceName, source, tab: selectedTab });
  // In the URL, so a reload or Share keeps it; the EDOT Browser Overview's KPIs read it.
  const { value: compare, setValue: setCompare } = useQueryParam('compare');
  const isComparing = compare === 'true';
  // Classic RUM only has the Overview (and Sessions' unavailable prompt); any other tab's URL is
  // replaced by the Overview's.
  const isUnsupportedTab = selectedTab !== 'sessions' && !isTabOf(source, selectedTab);
  useEffect(() => {
    if (isUnsupportedTab) {
      history.replace(overviewPath);
    }
  }, [history, isUnsupportedTab, overviewPath]);
  const tabHrefs: Record<WebApplicationTabId, string> = {
    overview: overviewHref,
    errors: errorsHref,
    network: networkHref,
    reports: reportsHref,
    sessions: sessionsHref(),
  };

  const reportTitle = REPORT_TEMPLATES.find(({ id }) => id === report)?.title;
  useRouteBreadcrumb(
    reportTitle
      ? [
          { text: serviceName, href: overviewHref },
          { text: APPLICATION_TAB_LABELS[selectedTab], href: reportsHref },
          { text: reportTitle },
        ]
      : [{ text: serviceName, href: overviewHref }, { text: APPLICATION_TAB_LABELS[selectedTab] }]
  );

  const renderOverview = () =>
    source === APPLICATION_SOURCE.otel ? (
      withPagePadding(<OtelOverview serviceName={serviceName} />)
    ) : (
      <ClassicRumOverview serviceName={serviceName} />
    );

  const renderSessions = () =>
    withPagePadding(
      source === APPLICATION_SOURCE.otel ? (
        <SessionsTab serviceName={serviceName} source={source} />
      ) : (
        sessionsUnavailablePrompt
      )
    );

  const renderTab = () => {
    if (isUnsupportedTab) {
      return null;
    }
    switch (selectedTab) {
      case 'errors':
        return withPagePadding(<ErrorsTab serviceName={serviceName} />);
      case 'network':
        return withPagePadding(<NetworkTab serviceName={serviceName} />);
      case 'sessions':
        return renderSessions();
      case 'reports':
        return withPagePadding(
          report === 'scorecard' ? (
            <ScorecardReport serviceName={serviceName} />
          ) : (
            <ReportsTab hrefs={{ scorecard: scorecardReportHref }} />
          )
        );
      default:
        return renderOverview();
    }
  };

  return (
    <>
      <AppHeader
        title={serviceName}
        back={{ href: applicationsHref, label: APPLICATIONS_LABEL }}
        share={shareAction}
        menu={
          source === APPLICATION_SOURCE.otel && selectedTab === 'overview'
            ? {
                items: [
                  {
                    id: 'compare',
                    order: 1,
                    label: COMPARE_LABEL,
                    iconType: 'compare',
                    isSelected: isComparing,
                    run: () => setCompare(isComparing ? undefined : 'true'),
                    testId: 'digitalExperienceOverviewCompareToggle',
                    ebt: { action: DIGITAL_EXPERIENCE_EBT_ACTIONS.TOGGLE_COMPARE },
                  },
                ],
              }
            : undefined
        }
        tabs={tabsOf(source).map((id) => ({
          id,
          label: APPLICATION_TAB_LABELS[id],
          isSelected: id === selectedTab,
          href: tabHrefs[id],
          'data-test-subj': `digitalExperienceTab-${id}`,
        }))}
      />
      {renderTab()}
    </>
  );
}
