/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiFieldTextProps } from '@elastic/eui';
import {
  EuiSpacer,
  EuiTitle,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { SelectedScriptDetails } from './selected_script_details';
import type { ValidationState } from './types';
import {
  SCRIPT_TIMEOUT_HELP,
  SCRIPT_TIMEOUT_LABEL,
  SCRIPT_ARGUMENTS_LABEL,
  OPTIONAL_FIELD_LABEL,
  TIMEOUT_TOOLTIP_CONTENT,
  SCRIPT_SELECTION_LABEL,
  SCRIPT_ARGUMENTS_REQUIRED_HELP_TEXT,
  SCRIPT_ARGUMENTS_PLACEHOLDER,
} from './translations';
import type { SupportedHostOsType } from '../../../../../common/endpoint/constants';
import type { EndpointRunScriptActionRequestParams } from '../../../../../common/api/endpoint';
import { useTestIdGenerator } from '../../../../management/hooks/use_test_id_generator';
import type { EndpointScript } from '../../../../../common/endpoint/types';
import type { EndpointRunscriptScriptSelectorProps } from '../../../../management/components/endpoint_runscript_script_selector';
import { EndpointRunscriptScriptSelector } from '../../../../management/components/endpoint_runscript_script_selector';
import { OS_TITLES } from '../../../../management/common/translations';
import { validateTimeoutValue } from './utils';

interface OsConfigValidationResult extends ValidationState {
  timeout: ValidationState;
  arguments: ValidationState;
}

export type RunScriptOsTypeConfigUpdates = ValidationState & {
  updatedConfig: EndpointRunScriptActionRequestParams;
};

export interface RunScriptOsTypeConfigProps {
  'data-test-subj'?: string;
  platform: SupportedHostOsType;
  config: EndpointRunScriptActionRequestParams;
  onChange: (updates: RunScriptOsTypeConfigUpdates) => void;
  /** If `true` (default) each field will include a label */
  showFieldLabels?: boolean;
}

/**
 * Displays each OS row for configuring a runscript action
 */
export const RunScriptOsTypeConfig = memo<RunScriptOsTypeConfigProps>(
  ({ config, onChange, 'data-test-subj': dataTestSubj, platform, showFieldLabels = true }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const [scriptSelected, setSelectedScript] = useState<EndpointScript | undefined>(undefined);

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
        data-test-subj={getTestId()}
      >
        {/* OS Column */}
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace={showFieldLabels} fullWidth>
            <EuiTitle
              size="s"
              css={css`
                width: 10ch;
                margin-top: 0.75rem;
              `}
              className="eui-textRight"
            >
              <h5>{OS_TITLES[platform] ?? platform}</h5>
            </EuiTitle>
          </EuiFormRow>
        </EuiFlexItem>

        {/* Right side of OS label column */}
        <EuiFlexItem className="eui-textTruncate">
          <EuiFlexGroup
            key={platform}
            gutterSize="m"
            alignItems="flexStart"
            justifyContent="spaceBetween"
          >
            {/* Script Selector Column */}
            <EuiFlexItem grow={2} className="eui-textTruncate">
              <EuiFormRow label={showFieldLabels ? SCRIPT_SELECTION_LABEL : undefined} fullWidth>
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
                  placeholder={SCRIPT_ARGUMENTS_PLACEHOLDER}
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
                data-test-subj={getTestId('timeoutContainer')}
                labelAppend={
                  showFieldLabels ? <EuiText size="xs">{OPTIONAL_FIELD_LABEL}</EuiText> : undefined
                }
                label={
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
                      <EuiFlexItem grow={false}>{SCRIPT_TIMEOUT_LABEL}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIconTip
                          content={<EuiText size="xs">{TIMEOUT_TOOLTIP_CONTENT}</EuiText>}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ) : undefined
                }
              >
                <EuiFieldText
                  isInvalid={!currentValidationState.timeout.isValid}
                  name="timeout"
                  disabled={!scriptSelected}
                  fullWidth
                  onChange={scriptTimeoutOnChangeHandler}
                  value={config.timeout ?? ''}
                  placeholder={SCRIPT_TIMEOUT_HELP}
                  data-test-subj={getTestId('timeout')}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          {scriptSelected && (
            <>
              <EuiSpacer size="s" />
              <SelectedScriptDetails
                script={scriptSelected}
                data-test-subj={getTestId('selectedScriptDetails')}
              />
            </>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
RunScriptOsTypeConfig.displayName = 'RunscriptOsTypeConfig';
