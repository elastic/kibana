/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';

import { ConnectToElasticsearch } from './connect_to_elasticsearch';
import { AlternateSolutions } from './alternate_solutions/alternate_solutions';
import { DiveDeeperWithElasticsearch } from './dive_deeper/dive_deeper_with_elasticsearch';
import { Footer } from './footer/footer';

export const SearchHomepageBody = () => (
  <KibanaPageTemplate.Section alignment="top" restrictWidth={false} grow>
    <EuiFlexGroup gutterSize="l" direction="column">
      <EuiFlexItem>
        <ConnectToElasticsearch />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule />
      </EuiFlexItem>
      <EuiFlexItem>
        <AlternateSolutions />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule />
      </EuiFlexItem>
      <EuiFlexItem>
        <DiveDeeperWithElasticsearch />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiHorizontalRule />
      </EuiFlexItem>
      <EuiFlexItem>
        <Footer />
      </EuiFlexItem>
    </EuiFlexGroup>
  </KibanaPageTemplate.Section>
);
