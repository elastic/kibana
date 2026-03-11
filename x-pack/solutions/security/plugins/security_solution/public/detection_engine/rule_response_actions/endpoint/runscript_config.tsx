/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { FieldConfig, FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { EuiFieldTextProps } from '@elastic/eui';
import {
  EuiIconTip,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useTestIdGenerator } from '../../../management/hooks/use_test_id_generator';
import type { EndpointRunScriptActionRequestParams } from '../../../../common/api/endpoint';
import type { AutomatedRunScriptConfig, EndpointScript } from '../../../../common/endpoint/types';
import type { EndpointRunscriptScriptSelectorProps } from '../../../management/components/endpoint_runscript_script_selector';
import { EndpointRunscriptScriptSelector } from '../../../management/components/endpoint_runscript_script_selector';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { CONSOLE_COMMANDS, OS_TITLES } from '../../../management/common/translations';
import { PlatformIcon } from '../../../management/components/endpoint_responder/components/header_info/platforms';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import type { SupportedHostOsType } from '../../../../common/endpoint/constants';

interface ValidationState {
  isValid: boolean;
  errors?: string[];
}

const RUNSCRIPT_CONFIG_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.runscriptConfig.runscriptConfigurationLabel',
  { defaultMessage: 'Operating system configuration' }
);
export const RUNSCRIPT_CONFIG_REQUIRES_ONE_OS = i18n.translate(
  'xpack.securitySolution.endpoint.runscriptConfig.runscriptConfigurationHelp',
  { defaultMessage: 'At least one OS script must be configured' }
);
const SCRIPT_SELECTION_LABEL = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptSelectionLabel',
  { defaultMessage: 'Script' }
);
const SCRIPT_ARGUMENTS_LABEL = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptArgumentsLabel',
  { defaultMessage: 'Arguments' }
);
const SCRIPT_TIMEOUT_LABEL = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptTimeoutLabel',
  { defaultMessage: 'Timeout' }
);
const SCRIPT_TIMEOUT_HELP = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptTimeoutValueTip',
  { defaultMessage: 'In seconds' }
);
const OPTIONAL_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.runscriptConfig.optionalFieldLabel',
  { defaultMessage: 'optional' }
);
const TIMEOUT_TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.runscriptConfig.timeoutTooltipContent',
  { defaultMessage: 'Script execution timeout in seconds. Defaults to 4 hours if not specified.' }
);
export const SCRIPT_ARGUMENTS_REQUIRED_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptArgumentsRequiredHelpText',
  { defaultMessage: 'Selected script requires arguments to be provided' }
);
export const TIMEOUT_VALUE_MUST_BE_NUMBER = i18n.translate(
  'xpack.securitySolution.runscriptConfig.invalidTimeoutValue',
  {
    defaultMessage: 'Value must be a number',
  }
);
export const TIMEOUT_VALUE_MUST_BE_GREATER_THAN_ZERO = i18n.translate(
  'xpack.securitySolution.runscriptConfig.timeoutMustBeGreaterThanZero',
  {
    defaultMessage: 'Value must be greater than 0',
  }
);

const validateTimeoutValue = (value: string | number | undefined): ValidationState => {
  if (value) {
    const timeoutValue = Number(value);

    if (isNaN(timeoutValue)) {
      return {
        isValid: false,
        errors: [TIMEOUT_VALUE_MUST_BE_NUMBER],
      };
    }

    if (timeoutValue < 1) {
      return {
        isValid: false,
        errors: [TIMEOUT_VALUE_MUST_BE_GREATER_THAN_ZERO],
      };
    }
  }

  return { isValid: true };
};

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

  type RunscriptOsValidationState = Record<SupportedHostOsType, ValidationState>;
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

  useEffect(() => {
    if (!valueIsRunScriptConfig) {
      emitUseFieldChange(getDefaultRunScriptConfiguration());
    }
  }, [emitUseFieldChange, valueIsRunScriptConfig]);

  if (!userHasRunScriptAuthz || !valueIsRunScriptConfig) {
    return null;
  }

  return (
    <EuiFormRow
      fullWidth
      label={RUNSCRIPT_CONFIG_LABEL}
      helpText={RUNSCRIPT_CONFIG_REQUIRES_ONE_OS}
      data-test-subj={dataTestSubj}
    >
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
                  onChange={({ updatedConfig, isValid, errors }) => {
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
                                  `${
                                    OS_TITLES[platform as keyof typeof OS_TITLES]
                                  }: ${errorMessage}`
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
                  }}
                />
              </div>
            );
          }
        )}
      </EuiText>
    </EuiFormRow>
  );
});
AutomatedRunScriptConfiguration.displayName = 'AutomatedRunScriptConfiguration';

interface RunScriptOsTypeConfigProps {
  'data-test-subj'?: string;
  platform: SupportedHostOsType;
  config: EndpointRunScriptActionRequestParams;
  onChange: (
    updates: ValidationState & {
      updatedConfig: EndpointRunScriptActionRequestParams;
    }
  ) => void;
  /** If `true` (default) each field will include a label */
  showFieldLabels?: boolean;
}

/** @private */
const RunScriptOsTypeConfig = memo<RunScriptOsTypeConfigProps>(
  ({ config, onChange, 'data-test-subj': dataTestSubj, platform, showFieldLabels = true }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const [scriptSelected, setSelectedScript] = useState<EndpointScript | undefined>(undefined);

    interface OsConfigValidationResult extends ValidationState {
      timeout: ValidationState;
      arguments: ValidationState;
    }
    const validateConfig = useCallback(
      (
        updatedConfig: EndpointRunScriptActionRequestParams,
        updatedScriptSelected: EndpointScript | undefined
      ): OsConfigValidationResult => {
        const validationResult: OsConfigValidationResult = {
          isValid: true,
          timeout: { isValid: true },
          arguments: { isValid: true },
        };

        validationResult.timeout = validateTimeoutValue(updatedConfig.timeout);

        if (updatedScriptSelected?.requiresInput && !updatedConfig.scriptInput) {
          validationResult.arguments.isValid = false;
          (validationResult.arguments.errors = validationResult.arguments.errors ?? []).push(
            SCRIPT_ARGUMENTS_REQUIRED_HELP_TEXT
          );
        }

        validationResult.isValid =
          validationResult.timeout.isValid && validationResult.arguments.isValid;
        validationResult.errors = validationResult.isValid
          ? undefined
          : (validationResult.timeout.errors ?? [])
              .map((errMessage) => `${SCRIPT_TIMEOUT_LABEL}: ${errMessage}`)
              .concat(
                (validationResult.arguments.errors ?? []).map(
                  (errMessage) => `${SCRIPT_ARGUMENTS_LABEL}: ${errMessage}`
                )
              );

        return validationResult;
      },
      []
    );

    const currentValidationState = useMemo(() => {
      return validateConfig(config, scriptSelected);
    }, [config, scriptSelected, validateConfig]);

    const scriptSelectionOnChangeHandler: EndpointRunscriptScriptSelectorProps['onChange'] =
      useCallback(
        (newSelectedScript) => {
          const updatedConfig = {
            ...config,
            scriptId: newSelectedScript?.id ?? '',
            // reset script input ++ timeout if no script is selected
            ...(!newSelectedScript ? { scriptInput: '', timeout: undefined } : {}),
          };
          const updatedConfigValidationResult = validateConfig(updatedConfig, newSelectedScript);

          if (newSelectedScript?.id !== config.scriptId) {
            onChange({
              isValid: updatedConfigValidationResult.isValid,
              errors: updatedConfigValidationResult.errors,
              updatedConfig,
            });
          }

          setSelectedScript(newSelectedScript);
        },
        [config, onChange, validateConfig]
      );

    const scriptSelectionOnScriptsLoadedHandler = useCallback<
      Required<EndpointRunscriptScriptSelectorProps>['onScriptsLoaded']
    >(
      (scriptList) => {
        if (config.scriptId && !scriptSelected) {
          setSelectedScript(scriptList.find((script) => script.id === config.scriptId));
        }
      },
      [config.scriptId, scriptSelected]
    );

    const scriptParamsOnChangeHandler: Required<EuiFieldTextProps>['onChange'] = useCallback(
      (ev) => {
        const updatedConfig = {
          ...config,
          scriptInput: ev.target.value ?? '',
        };
        const { isValid, errors } = validateConfig(updatedConfig, scriptSelected);

        onChange({
          isValid,
          errors,
          updatedConfig,
        });
      },
      [config, onChange, scriptSelected, validateConfig]
    );

    const scriptTimeoutOnChangeHandler: Required<EuiFieldTextProps>['onChange'] = useCallback(
      (ev) => {
        const userProvidedTimeoutValue = ev.target.value;
        const updatedConfig = {
          ...config,
          timeout: (userProvidedTimeoutValue as unknown as number) || undefined,
        };
        const { isValid, errors, timeout } = validateConfig(updatedConfig, scriptSelected);

        // Now that we know the user's value is valid, convert it to a number since the API expects a number
        if (userProvidedTimeoutValue && timeout.isValid) {
          updatedConfig.timeout = Number(userProvidedTimeoutValue);
        }

        onChange({
          isValid,
          errors,
          updatedConfig,
        });
      },
      [config, onChange, scriptSelected, validateConfig]
    );

    return (
      <EuiFlexGroup
        key={platform}
        gutterSize="m"
        alignItems="flexStart"
        justifyContent="spaceBetween"
        data-test-subj={dataTestSubj}
      >
        {/* OS Column */}
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace={showFieldLabels} fullWidth>
            <EuiFlexGroup
              responsive={false}
              wrap={false}
              gutterSize="s"
              alignItems="center"
              justifyContent="center"
              css={css`
                width: 10ch;
              `}
            >
              <EuiFlexItem grow={false}>
                <PlatformIcon platform={platform} size="m" />
              </EuiFlexItem>
              <EuiFlexItem className="eui-textTruncate" grow={false}>
                {OS_TITLES[platform] ?? platform}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>

        {/* Script Selector Column */}
        <EuiFlexItem grow={2}>
          <EuiFormRow
            label={showFieldLabels ? SCRIPT_SELECTION_LABEL : undefined}
            fullWidth
            helpText={
              // FIXME:PT implement way to view script definition details - use component from Ash's PR
              // scriptSelected ? 'TBD: Click here to view script definition details' : <>&nbsp;</>
              <>&nbsp;</>
            }
          >
            <EndpointRunscriptScriptSelector
              selectedScriptId={config.scriptId}
              osType={platform}
              onChange={scriptSelectionOnChangeHandler}
              onScriptsLoaded={scriptSelectionOnScriptsLoadedHandler}
              data-test-subj={getTestId('scriptSelector')}
            />
          </EuiFormRow>
        </EuiFlexItem>

        {/* Script Arguments Column */}
        <EuiFlexItem grow={2}>
          <EuiFormRow
            label={showFieldLabels ? SCRIPT_ARGUMENTS_LABEL : undefined}
            fullWidth
            helpText={
              !currentValidationState.arguments.errors && scriptSelected?.requiresInput
                ? SCRIPT_ARGUMENTS_REQUIRED_HELP_TEXT
                : currentValidationState.arguments.isValid && <>&nbsp;</>
            }
            isInvalid={!currentValidationState.arguments.isValid}
            error={currentValidationState.arguments.errors?.join('; ')}
            data-test-subj={getTestId('scriptParamsContainer')}
          >
            <EuiFieldText
              isInvalid={!currentValidationState.arguments.isValid}
              name="scriptParams"
              disabled={!scriptSelected}
              value={config.scriptInput}
              fullWidth
              onChange={scriptParamsOnChangeHandler}
              data-test-subj={getTestId('scriptParams')}
            />
          </EuiFormRow>
        </EuiFlexItem>

        {/* Script Timeout Column */}
        <EuiFlexItem grow={1}>
          <EuiFormRow
            fullWidth
            isInvalid={!currentValidationState.timeout.isValid}
            error={currentValidationState.timeout.errors?.join('; ')}
            helpText={
              currentValidationState.timeout.isValid && config.scriptId
                ? SCRIPT_TIMEOUT_HELP
                : currentValidationState.timeout.isValid && <>&nbsp;</>
            }
            label={showFieldLabels ? SCRIPT_TIMEOUT_LABEL : undefined}
            labelAppend={
              showFieldLabels ? (
                <EuiFlexGroup
                  responsive={false}
                  wrap={false}
                  alignItems="center"
                  justifyContent="flexEnd"
                  gutterSize="xs"
                  css={css`
                    line-height: 1rem;
                  `}
                >
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs">{OPTIONAL_FIELD_LABEL}</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiIconTip content={<EuiText size="xs">{TIMEOUT_TOOLTIP_CONTENT}</EuiText>} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : undefined
            }
            data-test-subj={getTestId('timeoutContainer')}
          >
            <EuiFieldText
              isInvalid={!currentValidationState.timeout.isValid}
              name="timeout"
              disabled={!scriptSelected}
              fullWidth
              onChange={scriptTimeoutOnChangeHandler}
              value={config.timeout ?? ''}
              data-test-subj={getTestId('timeout')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
RunScriptOsTypeConfig.displayName = 'RunscriptOsTypeConfig';
