/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useCurrentEuiBreakpoint,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Observability } from './observability';
import { Security } from './security';

export const AlternateSolutions: React.FC = () => {
  const currentBreakpoint = useCurrentEuiBreakpoint();

  return (
    <>
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('xpack.searchHomepage.threatDetectionSolutions.title', {
            defaultMessage: 'Looking for logs or threat detection solutions?',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGroup gutterSize="xl" direction={currentBreakpoint === 'xl' ? 'row' : 'column'}>
        <EuiFlexItem>
          <Observability />
        </EuiFlexItem>
        <EuiFlexItem>
          <Security />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
