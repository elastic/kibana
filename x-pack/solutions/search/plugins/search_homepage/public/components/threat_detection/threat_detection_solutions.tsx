/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Observability } from './observability';
import { Security } from './security';

export const ThreatDetectionSolutions: React.FC = () => (
  <EuiFlexGroup direction="column" gutterSize="s">
    <EuiFlexItem grow={false}>
      <EuiTitle size="xs">
        <span>
          {i18n.translate('xpack.searchHomepage.threatDetectionSolutions.title', {
            defaultMessage: 'Looking for logs or threat detection solutions?',
          })}
        </span>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xl" direction="row">
        <EuiFlexItem grow={false}>
          <Observability />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Security />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);
