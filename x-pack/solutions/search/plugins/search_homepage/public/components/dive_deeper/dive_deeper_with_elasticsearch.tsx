/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiText, EuiSpacer, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const DiveDeeperWithElasticsearch: React.FC = () => (
  <EuiFlexGroup direction="column" gutterSize="m">
    <EuiFlexItem grow={false}>
      <EuiTitle size="l">
        <span>
          {i18n.translate('xpack.searchHomepage.diveDeeper.title', {
            defaultMessage: 'Dive Deeper with Elasticsearch',
          })}
        </span>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText>
        <span>
          {i18n.translate('xpack.searchHomepage.diveDeeper.description', {
            defaultMessage:
              "Learn more about Elasticsearch's powerful search and analytics features. Explore tutorials, guides, and community stories.",
          })}
        </span>
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiSpacer size="m" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiLink href="https://www.elastic.co/guide/index.html" target="_blank">
        {i18n.translate('xpack.searchHomepage.diveDeeper.link', {
          defaultMessage: 'Learn More',
        })}
      </EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);
