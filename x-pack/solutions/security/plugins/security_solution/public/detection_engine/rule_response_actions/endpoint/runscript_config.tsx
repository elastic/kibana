/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
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
    const [data] = useFormData({ watch: [commandPath] });
    const isAutomatedRunsScriptEnabled = useIsExperimentalFeatureEnabled(
      'responseActionsEndpointAutomatedRunScript'
    );

    if (!isAutomatedRunsScriptEnabled) {
      return null;
    }

    return (
      <UseField<{ foo: string }> path={`${commandPath}.config`}>
        {(field) => {
          const { onChange, value } = field;

          return (
            <>
              <EuiSpacer />
              <h2>{'runscript options per os here'}</h2>
              <EuiSpacer />
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
              <EuiSpacer />
              <pre>
                {'`field`:'}
                {JSON.stringify(field, null, 2)}
              </pre>
            </>
          );
        }}
      </UseField>
    );

    // FIXME:PT Delete
    // Form Data at `comandPath`
    //
    // {
    //   "commandPath": "responseActions[1].params.command",
    //   "data": {
    //     "actions": [],
    //     "responseActions__array__": [
    //       {
    //         "id": 4,
    //         "path": "responseActions[0]",
    //         "isNew": true
    //       },
    //       {
    //         "id": 5,
    //         "path": "responseActions[1]",
    //         "isNew": true
    //       }
    //     ],
    //     "kibanaSiemAppUrl": "",
    //     "enabled": true,
    //     "responseActions": [
    //       {
    //         "params": {
    //           "command": "kill-process",
    //           "comment": "some comment",
    //           "config": {
    //             "overwrite": false,
    //             "field": "process.entry_leader.parent.entity_id"
    //           }
    //         },
    //         "actionTypeId": ".endpoint"
    //       },
    //       {
    //         "actionTypeId": ".endpoint",
    //         "params": {
    //           "command": "runscript",
    //           "comment": ""
    //         }
    //       }
    //     ]
    //   }
    // }
  }
);
RunscriptConfig.displayName = 'RunscriptConfig';
