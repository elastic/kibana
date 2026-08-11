/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab, AppHeaderTitle } from '@kbn/app-header';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import type { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { AppHeader } from '@kbn/app-header';
import { IndexLifecyclePhaseSelectOption } from '../../../common/storage_explorer';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { PrimaryProfilingSearchBar } from './primary_profiling_search_bar';
import { useLocalStorage } from '../../hooks/use_local_storage';
import { useProfilingSetupStatus } from '../contexts/profiling_setup_status/use_profiling_setup_status';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { AddDataTabs } from '../../views/add_data_view';

export function ProfilingAppPageTemplate({
  children,
  tabs = [],
  hideSearchBar = false,
  noDataConfig,
  restrictWidth = false,
  pageTitle = i18n.translate('xpack.profiling.appPageTemplate.pageTitle', {
    defaultMessage: 'Universal Profiling',
  }),
  showBetaBadge = false,
  customSearchBar,
}: {
  children?: React.ReactElement;
  tabs?: AppHeaderTab[];
  hideSearchBar?: boolean;
  noDataConfig?: NoDataPageProps;
  restrictWidth?: boolean;
  pageTitle?: AppHeaderTitle;
  showBetaBadge?: boolean;
  customSearchBar?: React.ReactNode;
}) {
  const {
    start: { observabilityShared },
  } = useProfilingDependencies();

  const [privilegesWarningDismissed, setPrivilegesWarningDismissed] = useLocalStorage(
    'profiling.privilegesWarningDismissed',
    false
  );
  const { profilingSetupStatus } = useProfilingSetupStatus();

  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;

  const history = useHistory();

  const router = useProfilingRouter();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [history.location.pathname]);

  return (
    <ObservabilityPageTemplate
      noDataConfig={noDataConfig}
      restrictWidth={restrictWidth}
      pageSectionProps={{
        contentProps: {
          style: {
            display: 'flex',
            flexGrow: 1,
          },
        },
      }}
    >
      <EuiFlexGroup direction="column" style={{ maxWidth: '100%' }}>
        <AppHeader
          spacing="largeBleed"
          title={pageTitle}
          tabs={tabs}
          menu={{
            items: [
              {
                id: 'storage-explorer',
                label: 'Storage explorer',
                href: router.link('/storage-explorer', {
                  query: {
                    kuery: '',
                    rangeFrom: 'now-15m',
                    rangeTo: 'now',
                    indexLifecyclePhase: IndexLifecyclePhaseSelectOption.All,
                  },
                }),
                iconType: 'database',
              },
              {
                id: 'settings',
                label: 'Settings',
                href: router.link('/settings'),
                iconType: 'gear',
                overflow: true,
              },
            ],
            primaryActionItem: {
              id: 'add-data',
              label: 'Add data',
              href: router.link('/add-data-instructions', {
                query: { selectedTab: AddDataTabs.Kubernetes },
              }),
              iconType: 'plusInCircle',
            },
          }}
          badges={
            showBetaBadge
              ? [
                  {
                    label: 'Beta',
                    color: 'hollow',
                    tooltip: 'This module is not GA. Please help us by reporting any bugs.',
                  },
                ]
              : undefined
          }
        />
        {!hideSearchBar && (
          <EuiFlexItem grow={false}>{customSearchBar ?? <PrimaryProfilingSearchBar />}</EuiFlexItem>
        )}
        {profilingSetupStatus?.unauthorized === true && privilegesWarningDismissed !== true ? (
          <EuiFlexItem grow={false}>
            <KbnWarningCallout
              title={i18n.translate('xpack.profiling.privilegesWarningTitle', {
                defaultMessage: 'User privilege limitation',
              })}
              text={i18n.translate('xpack.profiling.privilegesWarningDescription', {
                defaultMessage:
                  'Due to privileges issues we could not check the Universal Profiling status. If you encounter any issues or if data fails to load, please contact your administrator for assistance.',
              })}
              actionProps={{
                primary: {
                  children: i18n.translate('xpack.profiling.dismissPrivilegesCallout', {
                    defaultMessage: 'Dismiss',
                  }),
                  onClick: () => {
                    setPrivilegesWarningDismissed(true);
                  },
                  'data-test-subj': 'profilingProfilingAppPageTemplateDismissButton',
                },
              }}
              announceOnMount
            />
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
