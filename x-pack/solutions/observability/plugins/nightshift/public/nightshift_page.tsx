/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { EuiPageTemplate, EuiTab, EuiTabs } from '@elastic/eui';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  NIGHTSHIFT_APP_ID,
  OBSERVABILITY_OVERVIEW_APP_ID,
  SIGNIFICANT_EVENTS_APP_ID,
} from '@kbn/deeplinks-observability';
import { NIGHTSHIFT_APP_ROUTE } from '../common/constants';
import { NightshiftApp } from './app/app';
import { NightshiftAppHeader } from './app/app_header';
import { AutomationsView } from './automations';
import { useKibana } from './hooks/use_kibana';
import { useSignificantEventsAvailability } from './hooks/use_significant_events_availability';

type NightshiftView = 'investigations' | 'automations';

function useActiveView(): NightshiftView {
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const view = params.get('view');
  return view === 'automations' ? 'automations' : 'investigations';
}

export function NightshiftPage(): React.ReactElement | null {
  const {
    application,
    http: { basePath },
    serverless,
    observabilityShared,
  } = useKibana().services;
  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;
  const history = useHistory();
  const { search } = useLocation();
  const activeView = useActiveView();

  const settingsHref = application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    path: '/settings',
  });
  const navigateToSettings = useCallback(
    () => application.navigateToUrl(settingsHref),
    [application, settingsHref]
  );

  const handleTabClick = useCallback(
    (view: NightshiftView) => {
      const params = new URLSearchParams(search);
      if (view === 'investigations') {
        params.delete('view');
      } else {
        params.set('view', view);
      }
      history.replace({ search: params.toString() });
    },
    [history, search]
  );

  const { isAvailable, isLoading: isAvailabilityLoading } = useSignificantEventsAvailability();

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(NIGHTSHIFT_APP_ROUTE),
        text: i18n.translate('xpack.nightshift.breadcrumbs.linkText', {
          defaultMessage: 'Nightshift',
        }),
        deepLinkId: NIGHTSHIFT_APP_ID,
      },
    ],
    { serverless }
  );

  useEffect(() => {
    if (!isAvailabilityLoading && !isAvailable) {
      application.navigateToApp(OBSERVABILITY_OVERVIEW_APP_ID);
    }
  }, [application, isAvailable, isAvailabilityLoading]);

  if (!isAvailable) {
    return null;
  }

  return (
    <ObservabilityPageTemplate
      data-test-subj="nightshiftPage"
      restrictWidth={false}
      pageSectionProps={{
        color: 'subdued',
        paddingSize: 'none',
      }}
    >
      <NightshiftAppHeader onSettingsClick={navigateToSettings} settingsHref={settingsHref} />

      <EuiPageTemplate.Section component="div" color="plain" paddingSize="none">
        <EuiTabs>
          <EuiTab
            isSelected={activeView === 'investigations'}
            onClick={() => handleTabClick('investigations')}
            data-test-subj="nightshiftInvestigationsTab"
          >
            {i18n.translate('xpack.nightshift.page.investigationsTab', {
              defaultMessage: 'Investigations',
            })}
          </EuiTab>
          <EuiTab
            isSelected={activeView === 'automations'}
            onClick={() => handleTabClick('automations')}
            data-test-subj="nightshiftAutomationsTab"
          >
            {i18n.translate('xpack.nightshift.page.automationsTab', {
              defaultMessage: 'Automations',
            })}
          </EuiTab>
        </EuiTabs>
      </EuiPageTemplate.Section>

      <EuiPageTemplate.Section component="div" color="subdued" restrictWidth="900px">
        {activeView === 'automations' ? <AutomationsView /> : <NightshiftApp />}
      </EuiPageTemplate.Section>
    </ObservabilityPageTemplate>
  );
}
