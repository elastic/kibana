/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  CloudDefendPageId,
  CloudDefendSecuritySolutionContext,
} from '@kbn/cloud-defend-plugin/public';
import { css } from '@emotion/react';
import { CLOUD_DEFEND_BASE_PATH } from '@kbn/cloud-defend-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiEmptyPrompt, EuiFlexGroup } from '@elastic/eui';
import type { SecurityPageName, SecuritySubPluginRoutes } from '../app/types';
import { useKibana } from '../common/lib/kibana';
import { SecuritySolutionPageWrapper } from '../common/components/page_wrapper';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { FiltersGlobal } from '../common/components/filters_global';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

// This exists only for the type signature cast
const CloudDefendSpyRoute = ({ pageName, ...rest }: { pageName?: CloudDefendPageId }) => (
  <SpyRoute pageName={pageName as SecurityPageName | undefined} {...rest} />
);

const cloudDefendSecuritySolutionContext: CloudDefendSecuritySolutionContext = {
  getFiltersGlobalComponent: () => FiltersGlobal,
  getSpyRouteComponent: () => CloudDefendSpyRoute,
};

const CloudDefend = () => {
  const { cloudDefend, cloud } = useKibana().services;
  const CloudDefendRouter = cloudDefend.getCloudDefendRouter();
  const isServerless: boolean = cloud?.isServerlessEnabled;

  // Remove this once Cloud Defend Billing works
  if (isServerless) {
    return (
      <PluginTemplateWrapper>
        <SecuritySolutionPageWrapper noPadding noTimeline>
          <EuiFlexGroup
            css={css`
              // 250px is roughly the Kibana chrome with a page title and tabs
              min-height: calc(100vh - 250px);
            `}
            justifyContent="center"
            alignItems="center"
            direction="column"
          >
            <EuiEmptyPrompt
              color="plain"
              title={
                <h2>
                  <FormattedMessage
                    id="xpack.cloudDefend.serverlessNotOfferedTitle"
                    defaultMessage="Page Unavailable"
                  />
                </h2>
              }
              body={
                <p>
                  <FormattedMessage
                    id="xpack.cloudDefend.serverlessNotOfferedBodyMessage"
                    defaultMessage="Cloud defend is not enabled in serverless"
                  />
                </p>
              }
            />
          </EuiFlexGroup>
        </SecuritySolutionPageWrapper>
      </PluginTemplateWrapper>
    );
  }

  return (
    <PluginTemplateWrapper>
      <SecuritySolutionPageWrapper noPadding noTimeline>
        <CloudDefendRouter securitySolutionContext={cloudDefendSecuritySolutionContext} />
      </SecuritySolutionPageWrapper>
    </PluginTemplateWrapper>
  );
};

CloudDefend.displayName = 'CloudDefend';

export const routes: SecuritySubPluginRoutes = [
  {
    path: CLOUD_DEFEND_BASE_PATH,
    component: CloudDefend,
  },
];
