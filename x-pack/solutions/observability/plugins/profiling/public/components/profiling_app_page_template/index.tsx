/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab, AppHeaderTitle } from '@kbn/app-header';
import { SuppressChromeBackButton } from '@kbn/app-header';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { AppHeader } from '@kbn/app-header';
import { IndexLifecyclePhaseSelectOption } from '../../../common/storage_explorer';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { PrimaryProfilingSearchBar } from './primary_profiling_search_bar';
import { useLocalStorage } from '../../hooks/use_local_storage';
import { useProfilingSetupStatus } from '../contexts/profiling_setup_status/use_profiling_setup_status';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useBackNavigation } from '../contexts/back_navigation/use_back_navigation';
import { AddDataTabs } from '../../views/add_data_view/types';

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
  suppressMenu = false,
}: {
  children?: React.ReactElement;
  tabs?: AppHeaderTab[];
  hideSearchBar?: boolean;
  noDataConfig?: NoDataPageProps;
  restrictWidth?: boolean;
  pageTitle?: AppHeaderTitle;
  showBetaBadge?: boolean;
  customSearchBar?: React.ReactNode;
  suppressMenu?: boolean;
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

  const { search, pathname } = useLocation();

  const router = useProfilingRouter();

  const searchParams = new URLSearchParams(search);
  const kuery = searchParams.get('kuery') ?? '';
  const rangeFrom = searchParams.get('rangeFrom') || 'now-15m';
  const rangeTo = searchParams.get('rangeTo') || 'now';

  const backTarget = useBackNavigation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const appHeaderMenu = {
    items: [
      {
        id: 'storage-explorer',
        label: i18n.translate('xpack.profiling.headerActionMenu.storageExplorer', {
          defaultMessage: 'Storage explorer',
        }),
        href: router.link('/storage-explorer', {
          query: {
            kuery,
            rangeFrom,
            rangeTo,
            indexLifecyclePhase: IndexLifecyclePhaseSelectOption.All,
          },
        }),
        iconType: 'database',
      },
      {
        id: 'settings',
        label: i18n.translate('xpack.profiling.headerActionMenu.settings', {
          defaultMessage: 'Settings',
        }),
        href: router.link('/settings'),
        iconType: 'gear',
        overflow: true,
      },
    ],
    primaryActionItem: {
      id: 'add-data',
      label: i18n.translate('xpack.profiling.headerActionMenu.addData', {
        defaultMessage: 'Add data',
      }),
      href: router.link('/add-data-instructions', {
        query: { selectedTab: AddDataTabs.Kubernetes },
      }),
      iconType: 'plusCircle',
    },
  };

  return (
    <>
      {/*
        In some contexts like when using the noDataConfig prop, the page template might choose not to render it's children. 
        When that happens, because AppHeader is nested inside the template, it won't be rendered.
        Without an explicit AppHeader component, the Chrome Next framework would attempt to render the compatibility header with the back button derived from breadcrumbs.
        This component is here to prevent these edge cases from rendering incorrect back buttons. 
        When AppHeader exists, this component doesn't do anything so the explicit back buttons we do want to render (when using the back prop) won't be hidden. 
        It's safe to render both at the same time, suppression only happens for auto-generated back targets.
      */}
      <SuppressChromeBackButton />
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
            back={backTarget}
            spacing="largeBleed"
            title={pageTitle}
            tabs={tabs}
            menu={suppressMenu ? undefined : appHeaderMenu}
            badges={
              showBetaBadge
                ? [
                    {
                      label: i18n.translate('xpack.profiling.header.betaBadgeLabel', {
                        defaultMessage: 'Beta',
                      }),
                      color: 'hollow',
                      tooltip: i18n.translate('xpack.profiling.header.betaBadgeTooltip', {
                        defaultMessage:
                          'This module is not GA. Please help us by reporting any bugs.',
                      }),
                    },
                  ]
                : undefined
            }
          />
          {!hideSearchBar && (
            <EuiFlexItem grow={false}>
              {customSearchBar ?? <PrimaryProfilingSearchBar />}
            </EuiFlexItem>
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
    </>
  );
}
