/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useKibana } from '../../hooks/use_kibana';
import { EmptyPrompt } from '../empty_prompt/empty_prompt';

export const SearchSynonymsOverview = () => {
  const {
    services: { console: consolePlugin, history, searchNavigation },
  } = useKibana();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );
  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      grow={false}
      data-test-subj="searchSynonymsOverviewPage"
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      <EmptyPrompt />
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
