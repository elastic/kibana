/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer, useEuiTheme } from '@elastic/eui';

import { css } from '@emotion/react';
import { MetricPanels } from './metric_panels';
import { Footer } from '../footer/footer';
import { CloudResources } from './cloud_resources';
import { BodyLinks } from './body_links';

export const SearchHomepageBody = () => {
  const { euiTheme } = useEuiTheme();
  const itemPadding = css({ padding: `${euiTheme.size.xxl}` });

  return (
    <KibanaPageTemplate.Section alignment="top" restrictWidth={true} grow paddingSize="none">
      <EuiFlexGroup gutterSize="l" direction="column">
        <EuiFlexItem>
          <EuiSpacer size="l" />
          <MetricPanels panelType="complex" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSpacer size="l" />
          <CloudResources />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="xxl" />
        </EuiFlexItem>
        <EuiFlexItem>
          <BodyLinks />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule />
        </EuiFlexItem>
        <EuiFlexItem css={itemPadding}>
          <Footer />
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
};
