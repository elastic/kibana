/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { GraphVisualizationUpsellingSection } from '@kbn/security-solution-upselling/sections/graph_visualization';
import { useKibana } from '../../common/services';

export const GraphVisualizationUpsellingSectionESS = () => {
  const { services } = useKibana();
  return (
    <GraphVisualizationUpsellingSection
      upgradeHref={services.application.getUrlForApp('management', {
        path: 'stack/license_management',
      })}
    />
  );
};
