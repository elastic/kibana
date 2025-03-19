/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationConfigurationFormProps } from '@kbn/wci-common';
import React from 'react';
import { EuiDescribedFormGroup } from '@elastic/eui';

export const SalesforceConfigurationForm: React.FC<IntegrationConfigurationFormProps> = ({
  form,
}) => {
  const { control } = form;

  return (
    <EuiDescribedFormGroup
      ratio="third"
      title={<h3>Salesforce Configuration</h3>}
      description="Configure the salesforce details"
    >
      none
    </EuiDescribedFormGroup>
  );
};
