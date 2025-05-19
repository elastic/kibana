/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { IntegrationsCardGridTabs } from './integration_card_grid_tabs';
import { WithFilteredIntegrations } from './with_filtered_integrations';
import type { IntegrationCardMetadata, TopCalloutRenderer } from '../types';

export const SecurityIntegrations: React.FC<{
  checkCompleteMetadata?: IntegrationCardMetadata;
  topCalloutRenderer?: TopCalloutRenderer;
}> = ({ checkCompleteMetadata, topCalloutRenderer }) => {
  return (
    <WithFilteredIntegrations
      renderChildren={IntegrationsCardGridTabs}
      prereleaseIntegrationsEnabled={false}
      checkCompleteMetadata={checkCompleteMetadata}
      topCalloutRenderer={topCalloutRenderer}
    />
  );
};
