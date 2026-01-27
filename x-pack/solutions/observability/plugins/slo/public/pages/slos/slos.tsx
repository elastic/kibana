/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { paths, SLOS_WELCOME_PATH } from '@kbn/slo-shared-plugin/common/locators/paths';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { SloOutdatedCallout } from '../../components/slo/slo_outdated_callout';
import { useFetchSloDefinitions } from '../../hooks/use_fetch_slo_definitions';
import { useKibana } from '../../hooks/use_kibana';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { LoadingPage } from '../loading_page';
import { CreateSloBtn } from './components/common/create_slo_btn';
import { SloList } from './components/slo_list';
import { SloListSearchBar } from './components/slo_list_search_bar';
import { SLOsOverview } from './components/slos_overview/slos_overview';

export const SLO_PAGE_ID = 'slo-page-container';

export function SlosPage() {
  const {
    http: { basePath },
    serverless,
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const { hasAtLeast } = useLicense();
  const { data: permissions } = usePermissions();
  const history = useHistory();

  const {
    data: { total } = { total: 0 },
    isLoading,
    isError,
  } = useFetchSloDefinitions({ perPage: 0 });

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(paths.slos),
        text: i18n.translate('xpack.slo.breadcrumbs.slosLinkText', {
          defaultMessage: 'SLOs',
        }),
        deepLinkId: 'slo',
      },
    ],
    { serverless }
  );

  useEffect(() => {
    if ((!isLoading && total === 0) || hasAtLeast('platinum') === false || isError) {
      history.replace(SLOS_WELCOME_PATH);
    }

    if (permissions?.hasAllReadRequested === false) {
      history.replace(SLOS_WELCOME_PATH);
    }
  }, [history, basePath, hasAtLeast, isError, isLoading, total, permissions]);

  if (isLoading) {
    return <LoadingPage dataTestSubj="sloListPageLoading" />;
  }

  return (
    <ObservabilityPageTemplate
      data-test-subj="slosPage"
      pageHeader={{
        pageTitle: i18n.translate('xpack.slo.slosPage.', { defaultMessage: 'SLOs' }),
        rightSideItems: [<CreateSloBtn />],
      }}
    >
      <HeaderMenu />
      <SloOutdatedCallout />
      <SloListSearchBar />
      <EuiSpacer size="m" />
      <SLOsOverview />
      <EuiSpacer size="m" />
      <SloList />
    </ObservabilityPageTemplate>
  );
}
