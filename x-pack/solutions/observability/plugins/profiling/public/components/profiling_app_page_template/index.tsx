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
import { AppHeader } from '@kbn/app-header';
import { IndexLifecyclePhaseSelectOption } from '../../../common/storage_explorer';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { PrimaryProfilingSearchBar } from './primary_profiling_search_bar';
import { useProfilingRouter } from '../../hooks/use_profiling_router';
import { useDefaultTimeRange } from '../../hooks/use_default_time_range';
import { useBackNavigation } from '../contexts/back_navigation/use_back_navigation';
import { AddDataTabs } from '../../views/add_data_view/types';
import { ProfilingSchemaContextProvider } from '../contexts/profiling_schema/profiling_schema_context';
import { SchemaSelector } from '../schema_selector';
import { useSchemaQueryParam } from '../../hooks/use_schema_query_param';
import { useProfilingStatus } from '../contexts/profiling_status/use_profiling_status';
import {
  getStorageExplorerAvailability,
  StorageExplorerAvailability,
} from '../../utils/get_storage_explorer_availability';

export const STORAGE_EXPLORER_NOT_SET_UP_TOOLTIP = i18n.translate(
  'xpack.profiling.headerActionMenu.storageExplorer.notSetUpTooltip',
  {
    defaultMessage:
      'Storage explorer only supports Universal Profiling. Run the setup process to start using it.',
  }
);

export const STORAGE_EXPLORER_NOT_AVAILABLE_TOOLTIP = i18n.translate(
  'xpack.profiling.headerActionMenu.storageExplorer.notAvailableTooltip',
  { defaultMessage: 'Serverless support for Storage explorer is coming soon.' }
);

const STORAGE_EXPLORER_DISABLED_REASONS: Record<StorageExplorerAvailability, string | undefined> = {
  [StorageExplorerAvailability.Available]: undefined,
  [StorageExplorerAvailability.NotSetUp]: STORAGE_EXPLORER_NOT_SET_UP_TOOLTIP,
  [StorageExplorerAvailability.NotAvailable]: STORAGE_EXPLORER_NOT_AVAILABLE_TOOLTIP,
};

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
  showSchemaSelector = false,
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
  /** Renders schema selector that allows users to choose the profiling schema to query. */
  showSchemaSelector?: boolean;
}) {
  const {
    start: { observabilityShared },
  } = useProfilingDependencies();

  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;

  const { search, pathname } = useLocation();

  const router = useProfilingRouter();

  const { from: defaultRangeFrom, to: defaultRangeTo } = useDefaultTimeRange();

  const searchParams = new URLSearchParams(search);
  const kuery = searchParams.get('kuery') ?? '';
  const rangeFrom = searchParams.get('rangeFrom') || defaultRangeFrom;
  const rangeTo = searchParams.get('rangeTo') || defaultRangeTo;

  const backTarget = useBackNavigation();
  const { data: profilingStatus } = useProfilingStatus();
  const storageExplorerDisabledReason = profilingStatus?.isEnabled
    ? STORAGE_EXPLORER_DISABLED_REASONS[
        getStorageExplorerAvailability(profilingStatus.universalProfiling)
      ]
    : undefined;
  // The schema provider is rendered below, so we need to read the current schema from the query param here.
  const schema = useSchemaQueryParam();

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
        disableButton: storageExplorerDisabledReason !== undefined,
        tooltipContent: storageExplorerDisabledReason,
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
        <SchemaScope
          isEnabled={showSchemaSelector}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          kuery={kuery}
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
                {customSearchBar ?? (
                  <PrimaryProfilingSearchBar schema={showSchemaSelector ? schema : undefined} />
                )}
              </EuiFlexItem>
            )}
            {showSchemaSelector && (
              <EuiFlexItem grow={false} css={{ alignSelf: 'flex-start' }}>
                <SchemaSelector />
              </EuiFlexItem>
            )}
            <EuiFlexItem>{children}</EuiFlexItem>
          </EuiFlexGroup>
        </SchemaScope>
      </ObservabilityPageTemplate>
    </>
  );
}

function SchemaScope({
  isEnabled,
  children,
  ...searchParams
}: {
  isEnabled: boolean;
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  children: React.ReactElement;
}) {
  if (!isEnabled) {
    return children;
  }

  return (
    <ProfilingSchemaContextProvider {...searchParams}>{children}</ProfilingSchemaContextProvider>
  );
}
