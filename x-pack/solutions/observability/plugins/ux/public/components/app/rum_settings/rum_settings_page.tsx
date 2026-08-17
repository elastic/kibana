/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import { UX_APP_TITLE } from '../../../application/ux_breadcrumbs';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { uxAppHref } from '../../../utils/rum_search';
import {
  serviceNameFromPath,
  uxAppPath,
  uxSettingsTabFromPath,
  type UxSettingsTab,
} from '../../../utils/ux_app_path';
import { WebApplicationSelect } from '../rum_dashboard/panels/web_application_select';
import { CaptureSettingsPanel } from './capture_settings_panel';
import { InjectSnippetPanel } from './inject_snippet_panel';
import { RemoteClustersSettingsPanel } from './remote_clusters_settings_panel';
import { RepositorySettingsPanel } from './repository_settings_panel';

const SETTINGS_LABEL = i18n.translate('xpack.ux.settings.pageTitle', {
  defaultMessage: 'Settings',
});

const REPOSITORY_TAB_LABEL = i18n.translate('xpack.ux.settings.repositoryTabLabel', {
  defaultMessage: 'Repository',
});

const CAPTURE_TAB_LABEL = i18n.translate('xpack.ux.settings.captureTabLabel', {
  defaultMessage: 'Capture',
});

const INJECT_TAB_LABEL = i18n.translate('xpack.ux.settings.injectTabLabel', {
  defaultMessage: 'Inject snippet',
});

const REMOTE_CLUSTERS_TAB_LABEL = i18n.translate('xpack.ux.settings.remoteClustersTabLabel', {
  defaultMessage: 'Remote clusters',
});

export function RumSettingsPage() {
  const { http, observabilityShared } = useKibanaServices();
  const PageTemplateComponent = observabilityShared.navigation.PageTemplate;
  const history = useHistory();
  const { pathname, search } = useLocation();
  const serviceName = serviceNameFromPath(pathname);
  const tab = uxSettingsTabFromPath(pathname);

  const tabHref = (next: UxSettingsTab) => {
    const nextPath = uxAppPath(serviceName, `/settings/${next}`);
    return {
      href: history.createHref({ pathname: nextPath, search }),
      onClick: (event: React.MouseEvent) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        history.push({ pathname: nextPath, search });
      },
    };
  };

  useBreadcrumbs([
    {
      text: UX_APP_TITLE,
      href: uxAppHref(http.basePath.prepend, { search }),
    },
    ...(serviceName
      ? [
          {
            text: serviceName,
            href: uxAppHref(http.basePath.prepend, { search, serviceName }),
          },
        ]
      : []),
    { text: SETTINGS_LABEL },
  ]);

  return (
    <div data-test-subj="uxAppSettingsPage">
      <PageTemplateComponent
        paddingSize="m"
        pageHeader={{
          pageTitle: serviceName
            ? i18n.translate('xpack.ux.settings.appPageTitle', {
                defaultMessage: '{name} settings',
                values: { name: serviceName },
              })
            : SETTINGS_LABEL,
          rightSideItems:
            tab === 'inject' || (tab === 'repository' && serviceName)
              ? [
                  <div key="application" css={{ minWidth: 280, maxWidth: 360 }}>
                    <WebApplicationSelect />
                  </div>,
                ]
              : undefined,
          tabs: [
            {
              id: 'repository',
              label: REPOSITORY_TAB_LABEL,
              isSelected: tab === 'repository',
              'data-test-subj': 'uxSettingsRepositoryTab',
              ...tabHref('repository'),
            },
            {
              id: 'capture',
              label: CAPTURE_TAB_LABEL,
              isSelected: tab === 'capture',
              'data-test-subj': 'uxSettingsCaptureTab',
              ...tabHref('capture'),
            },
            {
              id: 'inject',
              label: INJECT_TAB_LABEL,
              isSelected: tab === 'inject',
              'data-test-subj': 'uxSettingsInjectTab',
              ...tabHref('inject'),
            },
            {
              id: 'remote-clusters',
              label: REMOTE_CLUSTERS_TAB_LABEL,
              isSelected: tab === 'remote-clusters',
              'data-test-subj': 'uxSettingsRemoteClustersTab',
              ...tabHref('remote-clusters'),
            },
          ],
        }}
      >
        {tab === 'repository' ? (
          <RepositorySettingsPanel serviceName={serviceName} />
        ) : tab === 'remote-clusters' ? (
          <RemoteClustersSettingsPanel />
        ) : tab === 'inject' ? (
          <InjectSnippetPanel defaultServiceName={serviceName} />
        ) : (
          <CaptureSettingsPanel />
        )}
      </PageTemplateComponent>
    </div>
  );
}
