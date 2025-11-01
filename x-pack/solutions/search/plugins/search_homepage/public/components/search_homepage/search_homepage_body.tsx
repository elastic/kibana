/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import { ActionButtons } from './action_buttons';
import { MetricPanels } from './metric_panels';

export const SearchHomepageBody = () => {
  return (
    <KibanaPageTemplate.Section alignment="top" restrictWidth={true} grow>
      <ActionButtons />
      <EuiSpacer size="l" />
      <MetricPanels />
      <EuiFlexGroup gutterSize="none" direction="column">
        <EuiFlexItem>
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        <EuiFlexItem>
          <div>
            <FormattedMessage
              id="xpack.searchHomepage.searchHomepageBody.div.textLabel"
              defaultMessage="text"
            />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
};
