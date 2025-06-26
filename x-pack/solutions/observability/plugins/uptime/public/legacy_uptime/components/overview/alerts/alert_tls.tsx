/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiExpression, EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { ValueExpression } from '@kbn/triggers-actions-ui-plugin/public';
import { TlsTranslations } from './translations';

interface Props {
  ageThreshold: number;
  expirationThreshold: number;
  setAgeThreshold: (value: number) => void;
  setExpirationThreshold: (value: number) => void;
}

export const AlertTlsComponent: React.FC<Props> = ({
  ageThreshold,
  expirationThreshold,
  setAgeThreshold,
  setExpirationThreshold,
}) => (
  <>
    <EuiSpacer size="m" />
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        <EuiExpression
          aria-label={TlsTranslations.criteriaAriaLabel}
          color="success"
          description={TlsTranslations.criteriaDescription}
          value={TlsTranslations.criteriaValue}
        />
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="tlsExpirationThreshold">
        <ValueExpression
          value={expirationThreshold}
          onChangeSelectedValue={(val) => {
            setExpirationThreshold(val);
          }}
          description={TlsTranslations.expirationDescription}
          errors={[]}
        />
      </EuiFlexItem>
      <EuiFlexItem data-test-subj="tlsAgeExpirationThreshold">
        <ValueExpression
          value={ageThreshold}
          onChangeSelectedValue={(val) => {
            setAgeThreshold(val);
          }}
          description={TlsTranslations.ageDescription}
          errors={[]}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="l" />
  </>
);
