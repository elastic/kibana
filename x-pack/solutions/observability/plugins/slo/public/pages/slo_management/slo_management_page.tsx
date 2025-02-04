/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { paths } from '../../../common/locators/paths';
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { SloManagementContent } from './components/slo_management_content';
import { usePermissions } from '../../hooks/use_permissions';

export function SloManagementPage() {
  const {
    http: { basePath },
    serverless,
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const { data: permissions } = usePermissions();
  const { hasAtLeast } = useLicense();

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

  const hasRequiredPrivileges =
    permissions?.hasAllReadRequested === true || permissions?.hasAllWriteRequested === true;
  const hasPlatinumLicense = hasAtLeast('platinum') === true;

  const errors = !hasRequiredPrivileges ? (
    <EuiText>
      {i18n.translate('xpack.slo.managementPage.sloPermissionsError', {
        defaultMessage: 'You must have read or write permissions for SLOs to access this page',
      })}
    </EuiText>
  ) : !hasPlatinumLicense ? (
    <EuiText>
      {i18n.translate('xpack.slo.managementPage.licenseError', {
        defaultMessage: 'You must have atleast a platinum license to access this page',
      })}
    </EuiText>
  ) : null;

  return (
    <ObservabilityPageTemplate
      data-test-subj="managementPage"
      pageHeader={{
        pageTitle: i18n.translate('xpack.slo.managementPage.pageTitle', {
          defaultMessage: 'SLOs Management',
        }),
      }}
    >
      <HeaderMenu />

      {!!errors ? errors : <SloManagementContent />}
    </ObservabilityPageTemplate>
  );
}
