/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { UnsavedFormProvider } from './providers/unsaved_form_provider';

import { useKibana } from './hooks/use_kibana';
import { Playground } from './components/playgorund';
import { usePlaygroundBreadcrumbs } from './hooks/use_playground_breadcrumbs';

export const PlaygroundOverview = () => {
  const {
    services: { history, console: consolePlugin, searchNavigation },
  } = useKibana();
  usePlaygroundBreadcrumbs();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="svlPlaygroundPage"
      grow={false}
      panelled={false}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      <UnsavedFormProvider>
        <Playground showDocs />
      </UnsavedFormProvider>
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
