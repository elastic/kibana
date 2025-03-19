/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IntegrationConfigurationFormProps } from '@kbn/wci-common';
import React from 'react';
import { EuiTextArea } from '@elastic/eui';
import { EuiFormRow } from '@elastic/eui';
import { EuiDescribedFormGroup } from '@elastic/eui';
import { Controller } from 'react-hook-form';
import { WCIIndexSourceConfiguration } from '../../common/types';

export const IndexSourceConfigurationForm: React.FC<
  IntegrationConfigurationFormProps<WCIIndexSourceConfiguration>
> = ({ form }) => {
  const { control } = form;

  return (
    <EuiDescribedFormGroup
      ratio="third"
      title={<h3>Index Source Configuration</h3>}
      description="Configure the index source details"
    >
      <EuiFormRow label="Additional Configuration">
        <Controller
          name="configuration"
          control={control}
          render={({ field }) => (
            <EuiTextArea
              data-test-subj="workchatAppIntegrationEditViewAdditionalConfig"
              placeholder="JSON configuration"
              value={JSON.stringify(field.value, null, 2)}
              onChange={(e) => field.onChange(JSON.parse(e.target.value))}
            />
          )}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
