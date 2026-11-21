/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, type ReactNode } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import { useGetLinkProps } from '@kbn/security-solution-navigation/links';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { ExperimentalFeaturesService } from '../../../experimental_features_service';
import type { GetSecuritySolutionLinkProps } from '../../links';
import { SecuritySideNavContent } from '../security_side_nav';
import { SecurityKibanaPageTemplate } from '../security_kibana_page_template';
import { getSecuritySolutionNavProps } from '../use_security_solution_navigation/get_security_solution_nav_props';

const SideNav: React.FC<{ selectedId: string }> = ({ selectedId }) => {
  const getLinkProps = useGetLinkProps();
  // Outside the Security app there is no Security URL state (time range, filters) to carry over.
  const getSecuritySolutionLinkProps = useCallback<GetSecuritySolutionLinkProps>(
    ({ deepLinkId, path, onClick }) => getLinkProps({ id: deepLinkId, path, onClick }),
    [getLinkProps]
  );

  return (
    <SecuritySideNavContent
      selectedId={selectedId}
      enableAlertsAndAttacksAlignment={
        ExperimentalFeaturesService.get().enableAlertsAndAttacksAlignment
      }
      getSecuritySolutionLinkProps={getSecuritySolutionLinkProps}
    />
  );
};

export interface SecurityClassicPageTemplateProps {
  selectedId: string;
  children: ReactNode;
  coreStart: CoreStart;
  spaces?: SpacesPluginStart;
}

/**
 * The Classic Security page template, with the Security navigation, for pages that another app
 * owns. The navigation gets its own Kibana context, so the host app's context stays as it is.
 */
export const SecurityClassicPageTemplate: React.FC<SecurityClassicPageTemplateProps> = ({
  selectedId,
  children,
  coreStart,
  spaces,
}) => {
  const solutionNav = getSecuritySolutionNavProps({
    children: (
      <KibanaContextProvider services={coreStart}>
        <NavigationProvider core={coreStart}>
          <SideNav selectedId={selectedId} />
        </NavigationProvider>
      </KibanaContextProvider>
    ),
    notifications: coreStart.notifications,
    capabilities: coreStart.application.capabilities,
    spaces,
  });

  return (
    <SecurityKibanaPageTemplate paddingSize="none" restrictWidth={false} solutionNav={solutionNav}>
      {children}
    </SecurityKibanaPageTemplate>
  );
};
