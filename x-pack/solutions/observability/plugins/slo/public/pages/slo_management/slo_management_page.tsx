/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import {
  SLOS_MANAGEMENT_PATH,
  SLOS_MANAGEMENT_TEMPLATES_PATH,
  paths,
} from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { ActionModalProvider } from '../../context/action_modal';
import { useFetchSloDefinitions } from '../../hooks/use_fetch_slo_definitions';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { LoadingPage } from '../loading_page';
import { HeaderControl } from './components/header_control/header_control';
import { SloOutdatedFilterCallout } from './components/slo_definitions/slo_management_outdated_filter_callout';
import { SloManagementTable } from './components/slo_definitions/slo_management_table';
import { SloTemplatesTable } from './components/slo_templates/slo_templates_table';
import { BulkOperationProvider } from './context/bulk_operation';
import { useTemplatesUrlSearchState } from './hooks/use_templates_url_search_state';

type ManagementTab = 'slos' | 'templates';

export function SloManagementPage() {
  const {
    http: { basePath },
    serverless,
    application: { navigateToUrl },
  } = useKibana().services;
  const history = useHistory();
  const { ObservabilityPageTemplate } = usePluginContext();
  const { data: permissions } = usePermissions();
  const { hasAtLeast } = useLicense();
  const {
    isLoading,
    isError,
    data: { total } = { total: 0 },
  } = useFetchSloDefinitions({ perPage: 0 });

  const templatesSearchState = useTemplatesUrlSearchState();

  const activeTab: ManagementTab =
    history.location.pathname === SLOS_MANAGEMENT_TEMPLATES_PATH ? 'templates' : 'slos';

  const onTabChange = (tab: ManagementTab) => {
    if (tab === 'templates') {
      history.push(SLOS_MANAGEMENT_TEMPLATES_PATH);
    } else {
      history.push(SLOS_MANAGEMENT_PATH);
    }
  };

  useEffect(() => {
    if (
      hasAtLeast('platinum') === false ||
      permissions?.hasAllReadRequested === false ||
      (!isLoading && total === 0) ||
      isError
    ) {
      navigateToUrl(basePath.prepend(paths.slosWelcome));
    }
  }, [basePath, hasAtLeast, isError, isLoading, navigateToUrl, total, permissions]);

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(paths.slos),
        text: i18n.translate('xpack.slo.breadcrumbs.sloTitle', {
          defaultMessage: 'SLOs',
        }),
        deepLinkId: 'slo',
      },
      {
        text: i18n.translate('xpack.slo.breadcrumbs.managementTitle', {
          defaultMessage: 'Management',
        }),
      },
    ],
    { serverless }
  );

  if (isLoading) {
    return <LoadingPage dataTestSubj="sloManagementPageLoading" />;
  }

  return (
    <ObservabilityPageTemplate
      data-test-subj="managementPage"
      pageHeader={{
        pageTitle: i18n.translate('xpack.slo.managementPage.pageTitle', {
          defaultMessage: 'SLO Management',
        }),
        rightSideItems:
          !isLoading && activeTab === 'slos'
            ? [
                <ActionModalProvider>
                  <HeaderControl />
                </ActionModalProvider>,
              ]
            : undefined,
      }}
    >
      <HeaderMenu />
      <EuiTabs>
        <EuiTab
          isSelected={activeTab === 'slos'}
          onClick={() => onTabChange('slos')}
          data-test-subj="managementTabSlos"
        >
          {i18n.translate('xpack.slo.managementPage.tab.slos', {
            defaultMessage: 'SLOs',
          })}
        </EuiTab>
        <EuiTab
          isSelected={activeTab === 'templates'}
          onClick={() => onTabChange('templates')}
          data-test-subj="managementTabTemplates"
        >
          {i18n.translate('xpack.slo.managementPage.tab.templates', {
            defaultMessage: 'SLO Templates',
          })}
        </EuiTab>
      </EuiTabs>
      <EuiSpacer size="m" />
      {activeTab === 'slos' && (
        <BulkOperationProvider>
          <ActionModalProvider>
            <EuiFlexGroup direction="column" gutterSize="m">
              <SloOutdatedFilterCallout />
              <SloManagementTable />
            </EuiFlexGroup>
          </ActionModalProvider>
        </BulkOperationProvider>
      )}
      {activeTab === 'templates' && (
        <SloTemplatesTable
          state={templatesSearchState.state}
          onStateChange={templatesSearchState.onStateChange}
        />
      )}
    </ObservabilityPageTemplate>
  );
}
