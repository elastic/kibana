/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { paths } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { SloEditForm } from './components/slo_edit_form';
import {
  CreationModeToggle,
  type CreationMode,
} from './components/nl_slo/creation_mode_toggle';
import { NlSloForm } from './components/nl_slo/nl_slo_form';
import { SloDiscoverForm } from './components/nl_slo/slo_discover_form';
import { useSloFormValues } from './hooks/use_slo_form_values';

export function SloEditPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
    serverless,
  } = useKibana().services;
  const { sloId } = useParams<{ sloId: string | undefined }>();
  const { initialValues, isLoading, isEditMode, slo } = useSloFormValues(sloId);

  const { data: permissions } = usePermissions();
  const { ObservabilityPageTemplate } = usePluginContext();
  const { hasAtLeast } = useLicense();
  const hasRightLicense = hasAtLeast('platinum');

  const [creationMode, setCreationMode] = useState<CreationMode>('manual');

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(paths.slos),
        text: i18n.translate('xpack.slo.breadcrumbs.sloLabel', {
          defaultMessage: 'SLOs',
        }),
        deepLinkId: 'slo',
      },
      ...(!!slo
        ? [
            {
              href: basePath.prepend(paths.sloDetails(slo.id, slo.instanceId)),
              text: slo!.name,
            },
          ]
        : []),
      {
        text: isEditMode
          ? i18n.translate('xpack.slo.breadcrumbs.sloEditLabel', {
              defaultMessage: 'Edit',
            })
          : i18n.translate('xpack.slo.breadcrumbs.sloCreateLabel', {
              defaultMessage: 'Create',
            }),
      },
    ],
    { serverless }
  );

  useEffect(() => {
    if (hasRightLicense === false || permissions?.hasAllReadRequested === false) {
      navigateToUrl(basePath.prepend(paths.slosWelcome));
    }

    if (permissions?.hasAllWriteRequested === false) {
      navigateToUrl(basePath.prepend(paths.slos));
    }
  }, [hasRightLicense, permissions, navigateToUrl, basePath]);

  const showToggle = !isEditMode && !isLoading;

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: isEditMode
          ? i18n.translate('xpack.slo.sloEditPageTitle', {
              defaultMessage: 'Edit SLO',
            })
          : i18n.translate('xpack.slo.sloCreatePageTitle', {
              defaultMessage: 'Create new SLO',
            }),
        bottomBorder: false,
      }}
      data-test-subj="sloEditPage"
    >
      <HeaderMenu />
      {showToggle && (
        <>
          <CreationModeToggle mode={creationMode} onChange={setCreationMode} />
          <EuiSpacer size="l" />
        </>
      )}
      {isLoading ? (
        <EuiLoadingSpinner size="xl" data-test-subj="sloEditLoadingSpinner" />
      ) : (
        <>
          {creationMode === 'ai_assisted' && !isEditMode && (
            <>
              <NlSloForm onApply={() => setCreationMode('manual')} />
              <EuiSpacer size="l" />
            </>
          )}
          {creationMode === 'auto_discover' && !isEditMode && (
            <SloDiscoverForm />
          )}
          <div
            style={
              (creationMode === 'ai_assisted' || creationMode === 'auto_discover') && !isEditMode
                ? { display: 'none' }
                : {}
            }
          >
            <SloEditForm
              slo={slo}
              formSettings={{ isEditMode }}
              initialValues={initialValues}
            />
          </div>
        </>
      )}
    </ObservabilityPageTemplate>
  );
}
