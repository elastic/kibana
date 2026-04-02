/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { CompositeSloEditForm } from './components/composite_slo_edit_form';
import { useFetchCompositeSlo } from './hooks/use_fetch_composite_slo';

export function CompositeSloEditPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
    serverless,
  } = useKibana().services;

  const { compositeSloId } = useParams<{ compositeSloId: string | undefined }>();
  const isEditMode = Boolean(compositeSloId);

  const { data: initialValues, isLoading: isLoadingCompositeSlo } =
    useFetchCompositeSlo(compositeSloId);

  const { data: permissions } = usePermissions();
  const { ObservabilityPageTemplate, experimentalFeatures } = usePluginContext();
  const { hasAtLeast } = useLicense();
  const hasRightLicense = hasAtLeast('platinum');

  useEffect(() => {
    if (
      hasRightLicense === false ||
      permissions?.hasAllReadRequested === false ||
      !experimentalFeatures?.compositeSlo?.enabled
    ) {
      navigateToUrl(basePath.prepend(paths.slos));
    }

    if (permissions?.hasAllWriteRequested === false) {
      navigateToUrl(basePath.prepend(paths.slos));
    }
  }, [hasRightLicense, permissions, navigateToUrl, basePath, experimentalFeatures]);

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(paths.slos),
        text: i18n.translate('xpack.slo.breadcrumbs.sloLabel', {
          defaultMessage: 'SLOs',
        }),
        deepLinkId: 'slo',
      },
      {
        text: isEditMode
          ? i18n.translate('xpack.slo.breadcrumbs.compositeSloEditLabel', {
              defaultMessage: 'Edit composite SLO',
            })
          : i18n.translate('xpack.slo.breadcrumbs.compositeSloCreateLabel', {
              defaultMessage: 'Create composite SLO',
            }),
      },
    ],
    { serverless }
  );

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: isEditMode
          ? i18n.translate('xpack.slo.compositeSloEditPageTitle', {
              defaultMessage: 'Edit composite SLO',
            })
          : i18n.translate('xpack.slo.compositeSloCreatePageTitle', {
              defaultMessage: 'Create composite SLO',
            }),
        bottomBorder: false,
      }}
      data-test-subj="compositeSloEditPage"
    >
      <HeaderMenu />
      {isEditMode && isLoadingCompositeSlo ? (
        <EuiLoadingSpinner size="xl" />
      ) : (
        <CompositeSloEditForm
          compositeSloId={compositeSloId}
          isEditMode={isEditMode}
          initialValues={initialValues}
        />
      )}
    </ObservabilityPageTemplate>
  );
}
