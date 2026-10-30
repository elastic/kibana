/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiEmptyPrompt, EuiLoadingLogo, EuiPageSection } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import { APPLICATION_SOURCE } from '../../../common/application_source';
import type { ApplicationSource } from '../../../common/types/applications';
import { useRouteBreadcrumb } from '../../breadcrumbs/use_route_breadcrumb';
import { useApplicationLinks } from '../../hooks/use_application_links';
import { useApplicationsHref } from '../../hooks/use_applications_href';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { useEnvironment } from '../../hooks/use_environment';
import { useTimeRange } from '../../hooks/use_time_range';
import { APPLICATIONS_LABEL, SESSIONS_LABEL } from '../../labels';
import { SessionsTab } from '../sessions/sessions_tab';
import { OtelOverview } from './otel_overview/otel_overview';

/** Tabs of the Application view, in display order. */
const APPLICATION_TAB_IDS = ['overview', 'sessions'] as const;

export type ApplicationTabId = (typeof APPLICATION_TAB_IDS)[number];

const APPLICATION_TAB_LABELS: Record<ApplicationTabId, string> = {
  overview: i18n.translate('xpack.digitalExperience.application.tabs.overview', {
    defaultMessage: 'Overview',
  }),
  sessions: SESSIONS_LABEL,
};

/** Sessions are built from EDOT Browser data only, so Classic RUM applications have none. */
const tabsOf = (source: ApplicationSource): readonly ApplicationTabId[] =>
  source === APPLICATION_SOURCE.otel ? APPLICATION_TAB_IDS : ['overview'];

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

export function ApplicationPage({
  serviceName,
  source,
  selectedTab,
}: {
  serviceName: string;
  source: ApplicationSource;
  selectedTab: ApplicationTabId;
}) {
  const applicationsHref = useApplicationsHref();
  const { overviewHref, sessionsHref } = useApplicationLinks(serviceName, source);
  const tabHrefs: Record<ApplicationTabId, string> = {
    overview: overviewHref,
    sessions: sessionsHref(),
  };

  useRouteBreadcrumb([
    { text: serviceName, href: overviewHref },
    { text: APPLICATION_TAB_LABELS[selectedTab] },
  ]);

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

  return (
    <>
      <AppHeader
        title={serviceName}
        back={{ href: applicationsHref, label: APPLICATIONS_LABEL }}
        tabs={tabsOf(source).map((id) => ({
          id,
          label: APPLICATION_TAB_LABELS[id],
          isSelected: id === selectedTab,
          href: tabHrefs[id],
          'data-test-subj': `digitalExperienceTab-${id}`,
        }))}
      />
      {selectedTab === 'sessions' ? renderSessions() : renderOverview()}
    </>
  );
}
