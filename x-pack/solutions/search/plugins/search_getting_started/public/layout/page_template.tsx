/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React, { useEffect, useMemo } from 'react';
import { useKibana } from '../hooks/use_kibana';
import { useGettingStartedBreadcrumbs } from '../hooks/use_breadcrumbs';

export const SearchGettingStartedPageTemplate = ({
  children,
  ...props
}: Partial<KibanaPageTemplateProps>) => {
  const {
    services: { console: consolePlugin, history, searchNavigation, usageCollection },
  } = useKibana();

  // Track telemetry for page visit
  useEffect(() => {
    usageCollection?.reportUiCounter?.('searchGettingStarted', 'loaded', 'page_view');
  }, [usageCollection]);

  useGettingStartedBreadcrumbs();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth
      data-test-subj="search-getting-started"
      grow={false}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
      {...props}
    >
      {children}
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
