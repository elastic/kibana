/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty } from '@elastic/eui';

export interface LinkToAlertsRuleProps {
  onClick?: () => void;
  ['data-test-subj']: string;
}

export const CreateAlertRuleButton = ({
  onClick,
  ['data-test-subj']: dataTestSubj,
}: LinkToAlertsRuleProps) => {
  return (
    <EuiButtonEmpty
      data-test-subj={dataTestSubj}
      onClick={onClick}
      size="xs"
      iconSide="left"
      flush="both"
      iconType="bell"
    >
      <FormattedMessage
        id="xpack.infra.infra.alerts.createAlertLink"
        defaultMessage="Create rule"
      />
    </EuiButtonEmpty>
  );
};
