/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { useKibana } from '../hooks/use_kibana';

type QueryRulesPageTemplateProps = React.ComponentProps<typeof KibanaPageTemplate> & {
  pageTemplateProps?: React.ComponentProps<typeof KibanaPageTemplate>;
  children: React.ReactNode;
};

export const QueryRulesPageTemplate: React.FC<QueryRulesPageTemplateProps> = ({
  children,
  ...props
}) => {
  const {
    services: { console: consolePlugin, history, searchNavigation },
  } = useKibana();

  const embeddedConsole = React.useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth
      grow={false}
      data-test-subj="queryRulesBasePage"
      solutionNav={searchNavigation?.useClassicNavigation(history)}
      color="primary"
      {...props}
    >
      {children}
      {embeddedConsole}
    </KibanaPageTemplate>
  );
};
