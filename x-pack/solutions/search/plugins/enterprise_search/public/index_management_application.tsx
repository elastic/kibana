/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

import type { ChromeBreadcrumb, CoreSetup, CoreStart, ScopedHistory } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n-react';
import type { IndexManagementPluginSetup } from '@kbn/index-management-shared-types';
import {
  KibanaContextProvider,
  reactRouterNavigate,
  useKibana as useKibanaReact,
} from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import type { PluginsStart } from './plugin';

const PARENT_BREADCRUMB = {
  text: i18n.translate('xpack.enterpriseSearch.indexManagement.breadcrumb', {
    defaultMessage: 'Build',
  }),
};

type IndexManagementKibanaContext = CoreStart & PluginsStart & { history: ScopedHistory };
const useKibana = () => useKibanaReact<IndexManagementKibanaContext>();

const SearchIndexManagementApp: React.FC<{
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
    let isMounted = true;
    let indexManagementUnmount: (() => void) | undefined;
    indexManagement
      .renderIndexManagementApp({
        element: indexManagementRef.current,
        history,
        setBreadcrumbs,
      })
      .then((unmount) => {
        if (isMounted) {
          indexManagementUnmount = unmount;
        } else {
          // Component already unmounted while the promise was in-flight;
          // tear down immediately to avoid leaking the rendered app.
          unmount();
        }
      });

    return () => {
      isMounted = false;
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

export const renderIndexManagementApp = async (
  element: HTMLElement,
  deps: {
    core: CoreSetup;
    history: ScopedHistory;
    indexManagement: IndexManagementPluginSetup;
  }
) => {
  const { core, history, indexManagement } = deps;
  const [coreStart, depsStart] = await core.getStartServices();
  const services = {
    ...depsStart,
    history,
  };
  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={{ ...coreStart, ...services }}>
        <I18nProvider>
          <SearchIndexManagementApp indexManagement={indexManagement} />
        </I18nProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
