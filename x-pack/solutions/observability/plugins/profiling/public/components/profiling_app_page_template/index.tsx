/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPageHeaderContentProps, EuiPageHeaderProps } from '@elastic/eui';
import {
  EuiBetaBadge,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import type { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { PrimaryProfilingSearchBar } from './primary_profiling_search_bar';
import { useLocalStorage } from '../../hooks/use_local_storage';
import { useProfilingSetupStatus } from '../contexts/profiling_setup_status/use_profiling_setup_status';

const headerPaddingFixCss = css`
  .euiPageHeaderContent {
    padding-bottom: 0;
  }
`;

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
  children: React.ReactElement;
  tabs?: EuiPageHeaderContentProps['tabs'];
  hideSearchBar?: boolean;
  noDataConfig?: NoDataPageProps;
  restrictWidth?: boolean;
  pageTitle?: React.ReactNode;
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [history.location.pathname]);

  return (
    <ObservabilityPageTemplate
      noDataConfig={noDataConfig}
      pageHeader={{
        'data-test-subj': 'profilingPageTemplate',
        pageTitle: (
          <EuiFlexGroup gutterSize="s" alignItems="baseline">
            <EuiFlexItem grow={false}>{pageTitle}</EuiFlexItem>
            {showBetaBadge && (
              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label="Beta"
                  color="hollow"
                  tooltipContent={i18n.translate('xpack.profiling.header.betaBadgeTooltip', {
                    defaultMessage: 'This module is not GA. Please help us by reporting any bugs.',
                  })}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
        color: 'subdued' as unknown as EuiPageHeaderProps['color'], // This value is valid but not properly typed
        children:
          tabs.length > 0 || !hideSearchBar ? (
            <EuiFlexGroup direction="column">
              {tabs.length > 0 && (
                <EuiFlexItem grow={false}>
                  <EuiTabs size="m" bottomBorder={!hideSearchBar}>
                    {tabs.map(({ label, ...tabRest }) => (
                      <EuiTab key={tabRest.href} {...tabRest}>
                        {label}
                      </EuiTab>
                    ))}
                  </EuiTabs>
                </EuiFlexItem>
              )}
              {!hideSearchBar && (
                <EuiFlexItem grow={false}>
                  {customSearchBar ?? <PrimaryProfilingSearchBar />}
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          ) : undefined,
        bottomBorder: 'extended',
        css: hideSearchBar && tabs.length > 0 ? headerPaddingFixCss : undefined,
      }}
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
        {profilingSetupStatus?.unauthorized === true && privilegesWarningDismissed !== true ? (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              announceOnMount
              iconType="warning"
              title={i18n.translate('xpack.profiling.privilegesWarningTitle', {
                defaultMessage: 'User privilege limitation',
              })}
            >
              <p>
                {i18n.translate('xpack.profiling.privilegesWarningDescription', {
                  defaultMessage:
                    'Due to privileges issues we could not check the Universal Profiling status. If you encounter any issues or if data fails to load, please contact your administrator for assistance.',
                })}
              </p>
              <EuiButton
                data-test-subj="profilingProfilingAppPageTemplateDismissButton"
                onClick={() => {
                  setPrivilegesWarningDismissed(true);
                }}
              >
                {i18n.translate('xpack.profiling.dismissPrivilegesCallout', {
                  defaultMessage: 'Dismiss',
                })}
              </EuiButton>
            </EuiCallOut>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </ObservabilityPageTemplate>
  );
}
