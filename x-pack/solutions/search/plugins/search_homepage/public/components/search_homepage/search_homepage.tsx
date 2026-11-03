/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { getSearchHomeConfig } from '../../home_config';

export const SearchHomepagePage = () => {
  const {
    services: { application, console: consolePlugin, elasticsearchHome, history, searchNavigation },
  } = useKibana();

  useEffect(() => {
    if (searchNavigation) {
      searchNavigation.breadcrumbs.setSearchBreadCrumbs([
        {
          text: i18n.translate('xpack.searchHomepage.breadcrumbs.home', { defaultMessage: 'Home' }),
        },
      ]);
    }
  }, [searchNavigation]);

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  const config = useMemo(() => getSearchHomeConfig({ application }), [application]);
  const { HomePage } = elasticsearchHome;

  return (
    <>
      <HomePage {...config} solutionNav={searchNavigation?.useClassicNavigation(history)} />
      {embeddableConsole}
    </>
  );
};
