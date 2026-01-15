/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { get } from 'lodash';
import { EuiSpacer } from '@elastic/eui';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

export interface RunscriptConfigProps {
  basePath: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

export const RunscriptConfig = memo<RunscriptConfigProps>(
  ({ basePath, disabled, readDefaultValueOnForm }) => {
    const commandPath = `${basePath}.command`;
    const overWritePath = `${basePath}.config.overwrite`;
    const [data] = useFormData({ watch: [commandPath, overWritePath] });
    const currentCommand = get(data, commandPath);
    const currentOverwrite = get(data, overWritePath);
    const isAutomatedRunsScriptEnabled = useIsExperimentalFeatureEnabled(
      'responseActionsEndpointAutomatedRunScript'
    );

    if (!isAutomatedRunsScriptEnabled) {
      return null;
    }

    return (
      <>
        <EuiSpacer />
        <h2>{'runscript options per os here'}</h2>
        <span>
          <pre>
            {JSON.stringify(
              {
                commandPath,
                data,
              },
              null,
              2
            )}
          </pre>
        </span>
      </>
    );
  }
);
RunscriptConfig.displayName = 'RunscriptConfig';
