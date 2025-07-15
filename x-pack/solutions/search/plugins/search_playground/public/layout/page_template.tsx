/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { KibanaPageTemplate, KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';

import { useKibana } from '../hooks/use_kibana';

export const SearchPlaygroundPageTemplate = ({
  children,
  ...props
}: Partial<KibanaPageTemplateProps>) => {
  const {
    services: { history, console: consolePlugin, searchNavigation },
  } = useKibana();
  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  const allProps: KibanaPageTemplateProps = {
    offset: 0,
    restrictWidth: false,
    grow: false,
    panelled: false,
    ...props,
  };

  return (
    <KibanaPageTemplate {...allProps} solutionNav={searchNavigation?.useClassicNavigation(history)}>
      {children}
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
