/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useEffect, useMemo } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useKibana } from '../../hooks/use_kibana';

/** Page shell of the home and the guided setup, for every view but the shared search home. */
export const AnalyticsPageTemplate: FC<
  PropsWithChildren<{ breadcrumb: string; 'data-test-subj': string }>
> = ({ breadcrumb, children, 'data-test-subj': dataTestSubj }) => {
  const {
    services: { chrome, console: consolePlugin, history, searchNavigation },
  } = useKibana();

  useEffect(() => {
    chrome.docTitle.change(breadcrumb);
    searchNavigation?.breadcrumbs.setSearchBreadCrumbs([{ text: breadcrumb }]);

    return () => {
      searchNavigation?.breadcrumbs.clearBreadcrumbs();
    };
  }, [breadcrumb, chrome, searchNavigation]);

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth
      grow={false}
      data-test-subj={dataTestSubj}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      {children}
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
