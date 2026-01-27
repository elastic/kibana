/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useEffect } from 'react';
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { ActionModalProvider } from '../../context/action_modal';
import { useFetchSloDefinitions } from '../../hooks/use_fetch_slo_definitions';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { LoadingPage } from '../loading_page';
import { HeaderControl } from './components/header_control/header_control';
import { SloOutdatedFilterCallout } from './components/slo_management_outdated_filter_callout';
import { SloManagementTable } from './components/slo_management_table';
import { BulkOperationProvider } from './context/bulk_operation';

export function SloManagementPage() {
  const {
    http: { basePath },
    serverless,
    application: { navigateToUrl },
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const { data: permissions } = usePermissions();
  const { hasAtLeast } = useLicense();
  const {
    isLoading,
    isError,
    data: { total } = { total: 0 },
  } = useFetchSloDefinitions({ perPage: 0 });

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
        rightSideItems: !isLoading
          ? [
              <ActionModalProvider>
                <HeaderControl />
              </ActionModalProvider>,
            ]
          : undefined,
      }}
    >
      <HeaderMenu />
      <BulkOperationProvider>
        <ActionModalProvider>
          <EuiFlexGroup direction="column" gutterSize="m">
            <SloOutdatedFilterCallout />
            <SloManagementTable />
          </EuiFlexGroup>
        </ActionModalProvider>
      </BulkOperationProvider>
    </ObservabilityPageTemplate>
  );
}
