/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb, ScopedHistory } from '@kbn/core/public';
import { IndexManagementPluginSetup } from '@kbn/index-management-shared-types';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useRef, useEffect, useCallback } from 'react';
import { useKibana } from '../../hooks/use_kibana';

import { i18n } from '@kbn/i18n';

const breadcrumbText = i18n.translate('management.breadcrumb', {
  defaultMessage: 'Content',
});

export const BREADCRUMB_NO_HREF = {
  text: breadcrumbText,
};

export const BREADCRUMB = {
  text: breadcrumbText,
  href: '/',
};
interface IndexManagementAppProps {
  indexManagement: IndexManagementPluginSetup;
}
export const IndexManagementApp: React.FC<IndexManagementAppProps> = ({ indexManagement }) => {
  const { history, searchNavigation } = useKibana().services;
  const managementRef = useRef(null);
  const setBreadcrumbs = useCallback(
    (crumbs: ChromeBreadcrumb[] = [], appHistory?: ScopedHistory) => {
      console.log('crumbs', crumbs);
      const wrapBreadcrumb = (item: ChromeBreadcrumb, scopedHistory: ScopedHistory) => ({
        ...item,
        ...(item.href ? reactRouterNavigate(scopedHistory, item.href) : {}),
      });

      // Clicking the Management breadcrumb to navigate back to the "root" only
      // makes sense if there's a management app open. So when one isn't open
      // this breadcrumb shouldn't be a clickable link.
      const breadcrumb = crumbs.length ? BREADCRUMB : BREADCRUMB_NO_HREF;
      const breadcrumbValue = [
        wrapBreadcrumb(breadcrumb, history),
        ...crumbs.map((item) => wrapBreadcrumb(item, appHistory || history)),
      ];

      searchNavigation?.breadcrumbs.setSearchBreadCrumbs(breadcrumbValue);
    },
    [searchNavigation, history]
  );

  useEffect(() => {
    const unmount = indexManagement.managementApp(managementRef.current, setBreadcrumbs, history);
    return unmount;
  }, [indexManagement, managementRef]);
  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="elasticsearchStartPage"
      grow={false}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      <KibanaPageTemplate.Section>
        <div ref={managementRef} />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
