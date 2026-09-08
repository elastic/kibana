/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { enableInspectEsQueries } from '@kbn/observability-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiPageSection, EuiSpacer } from '@elastic/eui';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import { AppHeader } from '@kbn/app-header';
import { WebApplicationSelect } from './panels/web_application_select';
import { UserPercentile } from './user_percentile';
import { useHasRumData } from './hooks/use_has_rum_data';
import { RumDatePicker } from './rum_datepicker';
import { EmptyStateLoading } from './empty_state_loading';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { UxEnvironmentFilter } from './environment_filter';
import { useAppMenu } from '../../../hooks/use_app_menu';
import { useUxPluginContext } from '../../../context/use_ux_plugin_context';

import { RumOverview } from '.';

export const DASHBOARD_LABEL = i18n.translate('xpack.ux.title', {
  defaultMessage: 'Dashboard',
});

export function RumHome() {
  const { docLinks, http, observabilityShared, observabilityAIAssistant, uiSettings } =
    useKibanaServices();
  const PageTemplateComponent = observabilityShared.navigation.PageTemplate;
  const { hasData, loading: isLoading, dataViewTitle } = useHasRumData();

  const noDataConfig: NoDataConfig | undefined = !hasData
    ? {
        action: {
          elasticAgent: {
            title: i18n.translate('xpack.ux.overview.beatsCard.title', {
              defaultMessage: 'Add RUM data',
            }),
            description: i18n.translate('xpack.ux.overview.beatsCard.description', {
              defaultMessage: 'Enable RUM with the APM agent to collect user experience data.',
            }),
            href: http.basePath.prepend('/app/apm/tutorial'),
            buttonText: i18n.translate('xpack.ux.overview.beatsCard.buttonLabel', {
              defaultMessage: 'Add RUM data',
            }),
            docsLink: docLinks.links.observability.guide,
            'data-test-subj': 'rumNoDataCard',
          },
        },
      }
    : undefined;

  let screenDescription = '';

  if (!hasData) {
    screenDescription = `The user is looking at a Getting Started screen that is displayed because no data could be retrieved.`;
  }
  if (dataViewTitle) {
    screenDescription = `${screenDescription} The index that was used to query the system is called ${dataViewTitle}.`;
  } else {
    screenDescription = `${screenDescription} The index that was used to query the system is undefined, so it is not configured yet.`;
  }

  const { isDev } = useUxPluginContext();
  const enableInspector = isDev || uiSettings.get<boolean>(enableInspectEsQueries);
  const { appMenu } = useAppMenu(enableInspector);

  useEffect(() => {
    return observabilityAIAssistant?.service.setScreenContext({
      screenDescription,
      starterPrompts: [
        ...(!hasData
          ? [
              {
                title: i18n.translate('xpack.ux.aiAssistant.starterPrompts.explainNoData.title', {
                  defaultMessage: 'Explain',
                }),
                prompt: i18n.translate('xpack.ux.aiAssistant.starterPrompts.explainNoData.prompt', {
                  defaultMessage: "Why don't I see any data?",
                }),
                icon: 'sparkles',
              },
            ]
          : []),
      ],
    });
  }, [hasData, observabilityAIAssistant?.service, screenDescription]);

  return (
    <PageTemplateComponent
      noDataConfig={isLoading ? undefined : noDataConfig}
      isPageDataLoaded={isLoading === false}
      pageSectionProps={{
        paddingSize: 'none',
      }}
    >
      <AppHeader title={DASHBOARD_LABEL} menu={appMenu} spacing="standard" />

      <EuiPageSection paddingSize="m" restrictWidth={false}>
        <DashboardToolbar />
        {isLoading && <EmptyStateLoading />}
        <div style={{ visibility: isLoading ? 'hidden' : 'initial' }}>
          <RumOverview />
        </div>
      </EuiPageSection>
    </PageTemplateComponent>
  );
}

function DashboardToolbar() {
  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup wrap>
        <EuiFlexItem>
          <WebApplicationSelect />
        </EuiFlexItem>
        <EuiFlexItem>
          <UserPercentile />
        </EuiFlexItem>
        <EuiFlexItem>
          <UxEnvironmentFilter />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RumDatePicker />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
    </>
  );
}
