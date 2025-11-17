/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, useEuiTheme } from '@elastic/eui';

import { css } from '@emotion/react';
import { MetricPanels } from './metric_panels';
import { PromoCard } from './promo_card';
import { CloudServerlessPromo } from '../cloud_serverless_promo/cloud_serverless_promo';
import { DiveDeeperWithElasticsearch } from '../dive_deeper/dive_deeper_with_elasticsearch';
import { AlternateSolutions } from '../alternate_solutions/alternate_solutions';
import { Footer } from '../footer/footer';
import { useKibana } from '../../hooks/use_kibana';
import { HomepageNavLinks } from './homepage_nav_links';

export const SearchHomepageBody = () => {
  const { euiTheme } = useEuiTheme();
  const itemPadding = css({ padding: `${euiTheme.size.xxl}` });
  const {
    services: { cloud: { isCloudEnabled = false } = {} },
  } = useKibana();

  return (
    <KibanaPageTemplate.Section alignment="top" restrictWidth={true} grow>
      <MetricPanels />
      <EuiFlexGroup gutterSize="l" direction="column">
        <EuiFlexItem>
          <EuiHorizontalRule margin="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <PromoCard />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <PromoCard />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="s" />
        </EuiFlexItem>
        {!isCloudEnabled && (
          <>
            <EuiFlexItem>
              <EuiHorizontalRule />
            </EuiFlexItem>
            <EuiFlexItem css={itemPadding}>
              <CloudServerlessPromo />
            </EuiFlexItem>
          </>
        )}
        <EuiFlexItem>
          <HomepageNavLinks type="dataManagement" />
        </EuiFlexItem>
        <EuiFlexItem>
          <HomepageNavLinks type="stackManagement" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="s" />
        </EuiFlexItem>
        <EuiFlexItem css={itemPadding}>
          <DiveDeeperWithElasticsearch />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule />
        </EuiFlexItem>
        <EuiFlexItem css={itemPadding}>
          <AlternateSolutions />
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
