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
import { PARENT_BREADCRUMB } from '../../constants';

export const SearchIndexManagementApp: React.FC<{
  indexManagement: IndexManagementPluginSetup;
}> = ({ indexManagement }) => {
  const { history, searchNavigation, cloud } = useKibana().services;
  const indexManagementRef = useRef<HTMLDivElement>(null);
  const setBreadcrumbs = useCallback(
    (crumbs: ChromeBreadcrumb[] = [], appHistory?: ScopedHistory) => {
      const wrapBreadcrumb = (item: ChromeBreadcrumb, scopedHistory: ScopedHistory) => ({
        ...item,
        ...(item.href ? reactRouterNavigate(scopedHistory, item.href) : {}),
      });

      const wrapBreadcrumbValue = !cloud?.isServerlessEnabled
        ? [wrapBreadcrumb(PARENT_BREADCRUMB, history)]
        : [];

      const breadcrumbValue = [
        ...wrapBreadcrumbValue,
        ...crumbs.map((item) => wrapBreadcrumb(item, appHistory || history)),
      ];

      searchNavigation?.breadcrumbs.setSearchBreadCrumbs(breadcrumbValue);
    },
    [searchNavigation, history, cloud]
  );

  useEffect(() => {
    // mount
    let indexManagementUnmount: () => void | undefined;
    indexManagement
      .renderIndexManagementApp({
        element: indexManagementRef.current,
        setBreadcrumbs,
        history,
      })
      .then((unmount) => {
        indexManagementUnmount = unmount;
      });

    return () => {
      // unmount
      indexManagementUnmount?.();
    };
  }, [indexManagement, indexManagementRef, setBreadcrumbs, history]);

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="elasticsearchIndexManagement"
      grow={false}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      <KibanaPageTemplate.Section>
        <div ref={indexManagementRef} />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
