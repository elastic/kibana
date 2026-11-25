/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ElasticsearchHomeAppProps } from '@kbn/elasticsearch-home/public';
import { useKibana } from '../../hooks/use_kibana';
import { getSearchHomeConfig } from '../../home_config';

/** The shared home page and its onboarding wizards, rendered with integrated onboarding. */
export const IntegratedHomeApp = () => {
  const {
    services: { application, console: consolePlugin, elasticsearchHome, history, searchNavigation },
  } = useKibana();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  const solutionNav = searchNavigation?.useClassicNavigation(history);
  const setBreadcrumbs = searchNavigation?.breadcrumbs.setSearchBreadCrumbs;
  const props: ElasticsearchHomeAppProps = useMemo(
    () => ({
      ...getSearchHomeConfig({ application }),
      solutionNav,
      setBreadcrumbs,
    }),
    [application, solutionNav, setBreadcrumbs]
  );
  const { HomeApp } = elasticsearchHome;

  return (
    <>
      <HomeApp {...props} />
      {embeddableConsole}
    </>
  );
};
