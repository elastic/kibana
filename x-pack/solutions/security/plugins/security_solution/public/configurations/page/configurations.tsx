/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { ConfigurationsTabs } from './configuration_tabs';
import { ConfigurationsRouter } from './configuration_router';

export const Configurations: React.FC = () => {
  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={true}>
      <KibanaPageTemplate.Section grow={true} bottomBorder="extended">
        <ConfigurationsTabs />
        <ConfigurationsRouter />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
