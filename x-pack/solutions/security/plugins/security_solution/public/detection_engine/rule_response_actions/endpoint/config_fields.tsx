/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiSpacer } from '@elastic/eui';
import { get } from 'lodash';
import { RunscriptConfig } from './runscript_config';
import { OverwriteField } from './overwrite_process_field';
import { FieldNameField } from './field_name';

interface AdditionalConfigFieldProps {
  basePath: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

export const ConfigFieldsComponent = (props: AdditionalConfigFieldProps) => {
  const { basePath, disabled, readDefaultValueOnForm } = props;
  const commandPath = `${basePath}.command`;
  const overWritePath = `${basePath}.config.overwrite`;
  const [data] = useFormData({ watch: [commandPath, overWritePath] });
  const currentCommand = get(data, commandPath);
  const currentOverwrite = get(data, overWritePath);

  if (currentCommand === 'kill-process' || currentCommand === 'suspend-process') {
    return (
      <>
        <EuiSpacer />
        <OverwriteField
          path={`${basePath}.config.overwrite`}
          disabled={disabled}
          readDefaultValueOnForm={readDefaultValueOnForm}
        />
        <EuiSpacer />
        <FieldNameField
          path={`${basePath}.config.field`}
          disabled={disabled}
          readDefaultValueOnForm={readDefaultValueOnForm}
          isRequired={!currentOverwrite}
        />
        <EuiSpacer />
      </>
    );
  }

  if (currentCommand === 'runscript') {
    return <RunscriptConfig {...props} />;
  }

  return null;
};

export const ConfigFields = React.memo(ConfigFieldsComponent);
