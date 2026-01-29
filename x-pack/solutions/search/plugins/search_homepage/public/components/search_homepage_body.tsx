/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  useEuiTheme,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ConnectToElasticsearch } from './connect_to_elasticsearch';
import { AlternateSolutions } from './alternate_solutions/alternate_solutions';
import { DiveDeeperWithElasticsearch } from './dive_deeper/dive_deeper_with_elasticsearch';
import { useUsageTracker } from '../contexts/usage_tracker_context';
import { AnalyticsEvents } from '../analytics/constants';
import { GetStartedWithElasticsearch } from './get_started_with_elasticsearch';
import { CloudServerlessPromo } from './cloud_serverless_promo/cloud_serverless_promo';
import { useKibana } from '../hooks/use_kibana';

export const SearchHomepageBody = () => {
  const usageTracker = useUsageTracker();
  const { euiTheme } = useEuiTheme();

  const connectPadding = css({ padding: `${euiTheme.size.l} ${euiTheme.size.xxl}` });
  const itemPadding = css({ padding: `${euiTheme.size.xxl}` });

  const {
    services: { cloud: { isCloudEnabled = false } = {} },
  } = useKibana();

  useEffect(() => {
    usageTracker.load(AnalyticsEvents.homepageLoaded);
  }, [usageTracker]);

  return (
    <KibanaPageTemplate.Section alignment="top" restrictWidth={false} grow paddingSize="none">
      <EuiFlexGroup gutterSize="none" direction="column">
        <EuiFlexItem css={connectPadding}>
          <ConnectToElasticsearch />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        <EuiFlexItem css={itemPadding}>
          <GetStartedWithElasticsearch />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule />
        </EuiFlexItem>
        <EuiFlexItem css={itemPadding}>
          <EuiTitle size="s">
            <h3>
              {i18n.translate('xpack.searchHomepage.additionalSolutions.title', {
                defaultMessage: 'Explore additional solutions',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="xl" />

          {!isCloudEnabled && (
            <>
              <CloudServerlessPromo />
              <EuiSpacer size="xl" />
              <EuiSpacer size="xl" />
            </>
          )}
          <AlternateSolutions />
          <EuiSpacer size="xl" />
          <EuiHorizontalRule margin="xxl" />
          <DiveDeeperWithElasticsearch />
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
};
