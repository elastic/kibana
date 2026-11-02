/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { FieldConfig, FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiTitle, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import {
  type RunScriptOsTypeConfigProps,
  type RunScriptOsTypeConfigUpdates,
  RunScriptOsTypeConfig,
} from './runscript_os_type_config';
import type { ValidationState } from './types';
import { useTestIdGenerator } from '../../../../management/hooks/use_test_id_generator';
import type { AutomatedRunScriptConfig } from '../../../../../common/endpoint/types';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { CONSOLE_COMMANDS, OS_TITLES } from '../../../../management/common/translations';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type { SupportedHostOsType } from '../../../../../common/endpoint/constants';
import { RUNSCRIPT_CONFIG_REQUIRES_ONE_OS, RUNSCRIPT_CONFIG_LABEL } from './translations';

const getDefaultRunScriptConfiguration = () => {
  return {
    linux: { scriptId: '', scriptInput: '', timeout: undefined },
    macos: { scriptId: '', scriptInput: '', timeout: undefined },
    windows: { scriptId: '', scriptInput: '', timeout: undefined },
  };
};

export interface RunscriptConfigProps {
  basePath: string;
  disabled: boolean;
  readDefaultValueOnForm: boolean;
}

export const RunscriptConfig = memo<RunscriptConfigProps>(
  ({ basePath, disabled, readDefaultValueOnForm }) => {
    const isAutomatedRunsScriptEnabled = useIsExperimentalFeatureEnabled(
      'responseActionsEndpointAutomatedRunScript'
    );
    const [validationState, setValidationState] = useState<ValidationState>({ isValid: true });

    const fieldConfig: FieldConfig<AutomatedRunScriptConfig> = useMemo(() => {
      const config: FieldConfig<AutomatedRunScriptConfig> = {
        defaultValue: getDefaultRunScriptConfiguration(),
        validations: [
          {
            validator: ({ value }) => {
              if (!value.linux.scriptId && !value.macos.scriptId && !value.windows.scriptId) {
                return {
                  code: 'invalid_script_id',
                  isInvalid: true,
                  message: RUNSCRIPT_CONFIG_REQUIRES_ONE_OS,
                };
              }

              if (!validationState.isValid) {
                return {
                  code: 'invalid_runscript_config',
                  isInvalid: true,
                  message: `${CONSOLE_COMMANDS.runscript.title}: ${
                    validationState.errors?.join('; ') ?? ''
                  }`,
                };
              }
            },
          },
        ],
      };

      return config;
    }, [validationState.errors, validationState.isValid]);

    const runscriptConfigOnChangeHandler = useCallback<
      AutomatedRunScriptConfigurationProps['onChange']
    >((runscriptFormState) => {
      setValidationState(runscriptFormState);
    }, []);

    const runscriptComponentProps = useMemo(() => {
      return {
        onChange: runscriptConfigOnChangeHandler,
        'data-test-subj': 'runscript-config-field',
      };
    }, [runscriptConfigOnChangeHandler]);

    if (!isAutomatedRunsScriptEnabled) {
      return null;
    }

    return (
      <>
        <EuiSpacer />
        <UseField<AutomatedRunScriptConfig>
          path={`${basePath}.config`}
          component={AutomatedRunScriptConfiguration}
          componentProps={runscriptComponentProps}
          config={fieldConfig}
          isDisabled={disabled}
          readDefaultValueOnForm={readDefaultValueOnForm}
        />
        <EuiSpacer size="l" />
      </>
    );
  }
);
RunscriptConfig.displayName = 'RunscriptConfig';

type RunscriptOsValidationState = Record<SupportedHostOsType, ValidationState>;

interface AutomatedRunScriptConfigurationProps {
  field: FieldHook<AutomatedRunScriptConfig>;
  onChange: (validationState: ValidationState) => void;
  'data-test-subj'?: string;
}

const AutomatedRunScriptConfiguration = memo<AutomatedRunScriptConfigurationProps>((props) => {
  const { field, onChange, 'data-test-subj': dataTestSubj } = props;
  const { onChange: fieldOnChange, value } = field;
  const getTestId = useTestIdGenerator(dataTestSubj);
  const userHasRunScriptAuthz = useUserPrivileges().endpointPrivileges.canWriteExecuteOperations;

  // Why are we checking that `field.value` is actually a RunScript configuration?
  // There is an issue with the form framework (`es-ui-shared-plugin/static/forms/*`) when removing items (response actions)
  // from the form. The `<UseField>` component does not properly handle the removal of items from the form when an item
  // that precedes the current one is removed - the form data becomes invalid and seems to inherit properties from
  // the removed item and drops other runscript specific form data.
  // Example:
  // If we have a `kill-process` response action (item 0) followed by a `runscript` response action (item 1), when
  // the `kill-process` action is removed from the form, the `runscript` form data is dropped and the form becomes
  // invalid, causing the entire page to crash.
  // The work-around here, after having no luck finding a solution, is to check the `value` and if it is not a runscript
  // config, then initialize it in `useEffect()` further below. NOTE however, that the prior form values will be lost ☹️
  const valueIsRunScriptConfig = useMemo(() => {
    return value.linux && value.macos && value.windows;
  }, [value]);

  const [osValidationState, setOsValidationState] = useState<RunscriptOsValidationState>({
    linux: { isValid: true },
    macos: { isValid: true },
    windows: { isValid: true },
  });

  const emitUseFieldChange = useCallback(
    (newValue: AutomatedRunScriptConfig) => {
      const event = new Event('change', {
        bubbles: true,
      }) as unknown as React.ChangeEvent<HTMLInputElement>;

      Object.defineProperty(event, 'target', {
        writable: false,
        value: { value: newValue, name: field.path },
      });

      fieldOnChange(event);
    },
    [field.path, fieldOnChange]
  );

  const osTypeOnChangeHandler: Record<SupportedHostOsType, RunScriptOsTypeConfigProps['onChange']> =
    useMemo(() => {
      const handleOsConfigChange = (
        osType: SupportedHostOsType,
        { updatedConfig, isValid, errors }: RunScriptOsTypeConfigUpdates
      ) => {
        const updatedValidationState: RunscriptOsValidationState = {
          ...osValidationState,
          [osType]: { isValid, errors },
        };

        setOsValidationState(updatedValidationState);
        onChange({
          isValid: Object.values(updatedValidationState).every(
            ({ isValid: isOsValueValid }) => isOsValueValid
          ),
          errors: Object.entries(updatedValidationState).reduce(
            (acc, [platform, osValidationResult]) => {
              if (!osValidationResult.isValid) {
                acc.push(
                  ...(osValidationResult.errors ?? []).map(
                    (errorMessage) =>
                      `${OS_TITLES[platform as keyof typeof OS_TITLES]}: ${errorMessage}`
                  )
                );
              }

              return acc;
            },
            [] as string[]
          ),
        });
        emitUseFieldChange({
          ...value,
          [osType]: updatedConfig,
        });
      };

      return {
        linux: (updates: RunScriptOsTypeConfigUpdates) => handleOsConfigChange('linux', updates),
        macos: (updates: RunScriptOsTypeConfigUpdates) => handleOsConfigChange('macos', updates),
        windows: (updates: RunScriptOsTypeConfigUpdates) =>
          handleOsConfigChange('windows', updates),
      };
    }, [emitUseFieldChange, onChange, osValidationState, value]);

  useEffect(() => {
    if (!valueIsRunScriptConfig) {
      emitUseFieldChange(getDefaultRunScriptConfiguration());
    }
  }, [emitUseFieldChange, valueIsRunScriptConfig]);

  if (!userHasRunScriptAuthz || !valueIsRunScriptConfig) {
    return null;
  }

  return (
    <EuiPanel
      data-test-subj={dataTestSubj}
      color="transparent"
      hasShadow={false}
      paddingSize="none"
    >
      <EuiTitle size="xxs">
        <h5>{RUNSCRIPT_CONFIG_LABEL}</h5>
      </EuiTitle>

      <EuiText color="subdued" size="s">
        <p>{RUNSCRIPT_CONFIG_REQUIRES_ONE_OS}</p>
      </EuiText>

      <EuiSpacer size="s" />

      <EuiPanel color="subdued" hasShadow={false} paddingSize="m" borderRadius="m" hasBorder={true}>
        <EuiText size="s">
          {(['linux', 'macos', 'windows'] as Array<keyof AutomatedRunScriptConfig>).map(
            (osType, index) => {
              return (
                <div key={osType}>
                  <EuiSpacer size="m" />

                  <RunScriptOsTypeConfig
                    key={osType}
                    platform={osType}
                    showFieldLabels={index === 0}
                    config={value[osType]}
                    data-test-subj={getTestId(osType)}
                    onChange={osTypeOnChangeHandler[osType]}
                  />
                </div>
              );
            }
          )}
        </EuiText>
      </EuiPanel>
    </EuiPanel>
  );
});
AutomatedRunScriptConfiguration.displayName = 'AutomatedRunScriptConfiguration';
