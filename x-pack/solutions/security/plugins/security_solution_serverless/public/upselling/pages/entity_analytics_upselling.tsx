/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EntityAnalyticsUpsellingPage } from '@kbn/security-solution-upselling/pages/entity_analytics';
import type { UpsellingPageProps } from '@kbn/security-solution-upselling/service';
import { useKibana } from '../../common/services';

export interface EntityAnalyticsUpsellingPageServerlessProps extends UpsellingPageProps {
  upgradeMessage: string;
  upgradeToLabel: string;
}

export const EntityAnalyticsUpsellingPageServerless = React.memo(
  ({ appHeader, upgradeMessage, upgradeToLabel }: EntityAnalyticsUpsellingPageServerlessProps) => {
    const { docLinks } = useKibana().services;

    return (
      <EntityAnalyticsUpsellingPage
        appHeader={appHeader}
        docLink={docLinks.links.securitySolution.entityAnalytics.entityRiskScoring}
        upgradeMessage={upgradeMessage}
        upgradeToLabel={upgradeToLabel}
      />
    );
  }
);

EntityAnalyticsUpsellingPageServerless.displayName = 'EntityAnalyticsUpsellingPageServerless';
