/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ConnectToElasticsearch } from './connect_to_elasticsearch';
import { ThreatDetectionSolutions } from './threat_detection/threat_detection_solutions';

export const SearchHomepageBody = () => (
  <KibanaPageTemplate.Section alignment="top" restrictWidth={false} grow>
    <EuiFlexGroup gutterSize="l" direction="column">
      <EuiFlexItem grow={false}>
        <ConnectToElasticsearch />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ThreatDetectionSolutions />
      </EuiFlexItem>
    </EuiFlexGroup>
  </KibanaPageTemplate.Section>
);
