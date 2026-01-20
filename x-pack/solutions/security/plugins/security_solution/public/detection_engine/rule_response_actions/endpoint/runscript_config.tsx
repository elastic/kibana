/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, type ComponentProps, useCallback } from 'react';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { EndpointRunscriptScriptSelector } from '../../../management/components/endpoint_runscript_script_selector';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { OS_TITLES } from '../../../management/common/translations';
import { PlatformIcon } from '../../../management/components/endpoint_responder/components/header_info/platforms';
import type { EndpointRunScriptActionRequestParams } from '../../../../common/api/endpoint';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import type { SupportedHostOsType } from '../../../../common/endpoint/constants';

type RunScriptUseFieldDataType = Record<SupportedHostOsType, EndpointRunScriptActionRequestParams>;

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

    const fieldConfig: ComponentProps<typeof UseField<RunScriptUseFieldDataType>>['config'] =
      useMemo(() => {
        return {
          defaultValue: {
            linux: { scriptId: '', scriptInput: '', timeout: undefined },
            macos: { scriptId: '', scriptInput: '', timeout: undefined },
            windows: { scriptId: '', scriptInput: '', timeout: undefined },
          },
          label: 'Run script',
        };
      }, []);

    if (!isAutomatedRunsScriptEnabled) {
      return null;
    }

    return (
      <>
        <EuiSpacer />
        <UseField<RunScriptUseFieldDataType>
          path={`${basePath}.config`}
          component={AutomatedRunScriptConfiguration}
          componentProps={{ 'data-test-subj': 'runscript-config-field' }}
          config={fieldConfig}
          isDisabled={disabled}
          readDefaultValueOnForm={readDefaultValueOnForm}
        />
      </>
    );
    //
    // return (
    //   <UseField<RunScriptUseFieldDataType> path={`${commandPath}.config`}>
    //     {(field) => {
    //       const { onChange, value } = field;
    //
    //       return (
    //         <>
    //           <EuiSpacer />
    //           <h2>{'runscript options per os here'}</h2>
    //           <EuiSpacer />
    //           <span>
    //             <pre>
    //               {JSON.stringify(
    //                 {
    //                   commandPath,
    //                   data,
    //                 },
    //                 null,
    //                 2
    //               )}
    //             </pre>
    //           </span>
    //           <EuiSpacer />
    //           <pre>
    //             {'`field`:'}
    //             {JSON.stringify(field, null, 2)}
    //           </pre>
    //         </>
    //       );
    //     }}
    //   </UseField>
    // );

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

export interface AutomatedRunScriptConfigurationProps {
  field: FieldHook<RunScriptUseFieldDataType>;
  'data-test-subj'?: string;
}

export const AutomatedRunScriptConfiguration = memo<AutomatedRunScriptConfigurationProps>(
  (props) => {
    const { field, 'data-test-subj': dataTestSubj } = props;
    const { onChange, value } = field;
    const [data] = useFormData();
    const userHasRunScriptAuthz = useUserPrivileges().endpointPrivileges.canWriteExecuteOperations;

    const emitChange = useCallback(
      (newValue: RunScriptUseFieldDataType) => {
        const event = new Event('change', {
          bubbles: true,
        }) as unknown as React.ChangeEvent<HTMLInputElement>;

        Object.defineProperty(event, 'target', {
          writable: false,
          value: {
            value: newValue,
            name: field.path,
          },
        });

        onChange(event);
      },
      [field.path, onChange]
    );

    if (!userHasRunScriptAuthz) {
      return null;
    }

    // FIXME:PT add i18n for all labels below
    return (
      <EuiText size="s" data-test-subj={dataTestSubj}>
        {(['linux', 'macos', 'windows'] as Array<keyof RunScriptUseFieldDataType>).map(
          (osType, index) => {
            const currentConfig = value[osType];

            return (
              <EuiFormRow fullWidth>
                <EuiFlexGroup
                  key={osType}
                  gutterSize="l"
                  alignItems="center"
                  justifyContent="spaceBetween"
                >
                  <EuiFlexItem>
                    <EuiFormRow hasEmptyLabelSpace>
                      <EuiFlexGroup
                        responsive={false}
                        wrap={false}
                        gutterSize="s"
                        alignItems="center"
                      >
                        <EuiFlexItem grow={false}>
                          <PlatformIcon platform={osType} size="m" />
                        </EuiFlexItem>
                        <EuiFlexItem>{OS_TITLES[osType] ?? osType}</EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow label={index === 0 ? 'Script' : undefined}>
                      <EndpointRunscriptScriptSelector
                        selectedScriptId={currentConfig.scriptId}
                        osType={osType}
                        onChange={(script) => {
                          emitChange({
                            ...value,
                            [osType]: {
                              ...value[osType],
                              scriptId: script?.id ?? '',
                            },
                          });
                        }}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow label={index === 0 ? 'Script arguments (if any)' : undefined}>
                      <EuiFieldText name="scriptParms" fullWidth />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFormRow label={index === 0 ? 'Script execution timeout' : undefined}>
                      <EuiFieldText name="timeout" fullWidth />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>
            );
          }
        )}

        <EuiSpacer size="xxl" />
        <EuiHorizontalRule />
        <EuiSpacer size="xxl" />
        <EuiSpacer size="xxl" />
        <div>
          <pre>
            {'`field`:'}
            {JSON.stringify(props.field, null, 2)}
          </pre>
        </div>
        <EuiSpacer size="xxl" />
        <div>
          <pre>
            {'`data`:'}
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </EuiText>
    );
  }
);
AutomatedRunScriptConfiguration.displayName = 'AutomatedRunScriptConfiguration';
