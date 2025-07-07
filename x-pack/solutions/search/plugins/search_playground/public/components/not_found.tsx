/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { PLUGIN_ID } from '../../common';
import { useKibana } from '../hooks/use_kibana';

export const PlaygroundRouteNotFound = () => {
  const {
    services: { application, history, console: consolePlugin, searchNavigation },
  } = useKibana();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );
  const goToPlayground = useCallback(() => {
    application.navigateToApp(PLUGIN_ID);
  }, [application]);

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="playgroundNotFoundPage"
      grow={false}
      panelled={false}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
    >
      <KibanaPageTemplate.EmptyPrompt
        iconType="logoElasticsearch"
        title={
          <h1>
            {i18n.translate('xpack.searchPlayground.notFound.title', {
              defaultMessage: '404 error',
            })}
          </h1>
        }
        body={
          <p>
            {i18n.translate('xpack.searchPlayground.notFound.description', {
              defaultMessage: 'The page you’re looking for was not found.',
            })}
          </p>
        }
        actions={
          <EuiButton data-test-subj="playgroundRouteNotFoundCTA" onClick={goToPlayground} fill>
            {i18n.translate('xpack.searchPlayground.notFound.action1', {
              defaultMessage: 'Back to Playground',
            })}
          </EuiButton>
        }
      />
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
