/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CLOUD_SECURITY_POSTURE_BASE_PATH } from '@kbn/cloud-security-posture-common';
import type { CloudSecurityPosturePageId } from '@kbn/cloud-security-posture-plugin/public';
import { type CspSecuritySolutionContext } from '@kbn/cloud-security-posture-plugin/public';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import type { SecurityPageName, SecuritySubPluginRoutes } from '../app/types';
import { useKibana } from '../common/lib/kibana';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { FiltersGlobal } from '../common/components/filters_global';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

// This exists only for the type signature cast
const CloudPostureSpyRoute = ({ pageName, ...rest }: { pageName?: CloudSecurityPosturePageId }) => (
  <SpyRoute pageName={pageName as SecurityPageName | undefined} {...rest} />
);

const cspSecuritySolutionContext: CspSecuritySolutionContext = {
  getFiltersGlobalComponent: () => FiltersGlobal,
  getSpyRouteComponent: () => CloudPostureSpyRoute,
};

const CloudSecurityPosture = () => {
  const { cloudSecurityPosture } = useKibana().services;
  const CloudSecurityPostureRouter = cloudSecurityPosture.getCloudSecurityPostureRouter();

  return (
    <PluginTemplateWrapper>
      <TrackApplicationView viewId="cloud_security_posture">
        <SecuritySolutionPageWrapper noPadding noTimeline>
          <CloudSecurityPostureRouter securitySolutionContext={cspSecuritySolutionContext} />
        </SecuritySolutionPageWrapper>
      </TrackApplicationView>
    </PluginTemplateWrapper>
  );
};

CloudSecurityPosture.displayName = 'CloudSecurityPosture';

export const routes: SecuritySubPluginRoutes = [
  {
    path: CLOUD_SECURITY_POSTURE_BASE_PATH,
    component: CloudSecurityPosture,
  },
];
