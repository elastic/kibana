/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  APPLICATIONS_LABEL,
  UX_APP_TITLE,
  uxInventoryBreadcrumbs,
} from '../../../application/ux_breadcrumbs';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { uxAppHref } from '../../../utils/rum_search';
import { RumDatePicker } from '../rum_dashboard/rum_datepicker';
import { UxProductTour } from '../rum_tour/ux_tour_context';

export type UxInventoryTab = 'applications' | 'errors';

const ERRORS_TAB = i18n.translate('xpack.ux.inventory.errorsTabLabel', {
  defaultMessage: 'Errors',
});

export function UxInventoryChrome({
  tab,
  isPageDataLoaded,
  children,
}: {
  tab: UxInventoryTab;
  isPageDataLoaded: boolean;
  children: React.ReactNode;
}) {
  const { http, observabilityShared } = useKibanaServices();
  const PageTemplateComponent = observabilityShared.navigation.PageTemplate;
  const history = useHistory();
  const { search } = useLocation();
  const inventoryHref = uxAppHref(http.basePath.prepend, { search });

  useBreadcrumbs(uxInventoryBreadcrumbs({ tab, inventoryHref }));

  const tabLink = (pathname: string) => ({
    href: history.createHref({ pathname, search }),
    onClick: (event: React.MouseEvent) => {
      event.preventDefault();
      history.push({ pathname, search });
    },
  });

  return (
    <PageTemplateComponent
      pageHeader={{
        children: (
          <div style={{ width: '100%' }}>
            <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween" wrap>
              <EuiFlexItem grow={false}>
                <EuiTitle>
                  <h1 className="eui-textNoWrap">{UX_APP_TITLE}</h1>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ marginLeft: 'auto' }}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <UxProductTour />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <RumDatePicker />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiTabs>
              <EuiTab
                isSelected={tab === 'applications'}
                data-test-subj="uxInventoryAppsTab"
                {...tabLink('/')}
              >
                {APPLICATIONS_LABEL}
              </EuiTab>
              <EuiTab
                isSelected={tab === 'errors'}
                data-test-subj="uxInventoryErrorsTab"
                {...tabLink('/errors')}
              >
                {ERRORS_TAB}
              </EuiTab>
            </EuiTabs>
          </div>
        ),
      }}
      isPageDataLoaded={isPageDataLoaded}
    >
      {children}
    </PageTemplateComponent>
  );
}
