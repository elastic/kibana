import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useKibana } from '../hooks/use_kibana';
import React, { useMemo } from 'react';
import { useGettingStartedBreadcrumbs } from '../hooks/use_breadcrumbs';

export const SearchGettingStartedPageTemplate = ({
  children,
  ...props
}: Partial<KibanaPageTemplateProps>) => {
  const {
    services: { console: consolePlugin, history, searchNavigation },
  } = useKibana();

  useGettingStartedBreadcrumbs();

  const embeddableConsole = useMemo(
    () => (consolePlugin?.EmbeddableConsole ? <consolePlugin.EmbeddableConsole /> : null),
    [consolePlugin]
  );

  return (
    <KibanaPageTemplate
      offset={0}
      restrictWidth={false}
      data-test-subj="search-getting-started"
      grow={false}
      panelled={false}
      solutionNav={searchNavigation?.useClassicNavigation(history)}
      {...props}
    >
      {children}
      {embeddableConsole}
    </KibanaPageTemplate>
  );
};
