/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiButton, EuiCode, EuiSpacer, EuiText } from '@elastic/eui';
import { useKibana } from '../hooks/use_kibana';

export const ProjectExample = () => {
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
      solutionNav={searchNavigation?.useClassicNavigation(history)}
      data-test-subj="searchUxSandboxOverviewPage"
      color="primary"
    >
      <KibanaPageTemplate.Header pageTitle="Project example" restrictWidth color="primary" />

      <KibanaPageTemplate.Section restrictWidth>
        <EuiText>
          Your content goes here. And we can consume existing Kibana components like the
          <EuiCode>Embeddable Console</EuiCode> plugin. You can see the at the bottom{' '}
          <span role="img" aria-label="downwards arrow">
            👇
          </span>
        </EuiText>
        <EuiSpacer />
        <EuiText>This example loads the Classic Navigation as an example.</EuiText>
        <EuiSpacer />
        <EuiButton
          data-test-subj="ProjectExampleBackButton"
          onClick={() => {
            history.goBack();
          }}
        >
          Back
        </EuiButton>
      </KibanaPageTemplate.Section>
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
