/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { SettingsForm } from './settings_form';
import { useKibana } from '../../hooks/use_kibana';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { paths } from '../../../common/locators/paths';
import { HeaderMenu } from '../../components/header_menu/header_menu';

export function SloSettingsPage() {
  const {
    http: { basePath },
    serverless,
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(paths.slosSettings),
        text: i18n.translate('xpack.slo.breadcrumbs.slosSettingsText', {
          defaultMessage: 'SLOs Settings',
        }),
      },
    ],
    { serverless }
  );

  return (
    <ObservabilityPageTemplate
      data-test-subj="slosSettingsPage"
      pageHeader={{
        pageTitle: i18n.translate('xpack.slo.pageHeader.title.', {
          defaultMessage: 'SLOs Settings',
        }),
        rightSideItems: [],
      }}
    >
      <HeaderMenu />
      <SettingsForm />
    </ObservabilityPageTemplate>
  );
}
