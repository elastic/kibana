/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
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
import { OS_TITLES } from '../../../management/common/translations';
import { PlatformIcon } from '../../../management/components/endpoint_responder/components/header_info/platforms';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import type { SupportedHostOsType } from '../../../../common/endpoint/constants';

const RUNSCRIPT_CONFIG_LABEL = i18n.translate(
  'xpack.securitySolution.endpoint.runscriptConfig.runscriptConfigurationLabel',
  { defaultMessage: 'OS configuration' }
);
const RUNSCRIPT_CONFIG_REQUIRES_ONE_OS = i18n.translate(
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
const OPTIONAL_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.runscriptConfig.optionalFieldLabel',
  { defaultMessage: 'optional' }
);
const TIMEOUT_TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.runscriptConfig.timeoutTooltipContent',
  { defaultMessage: 'Script execution timeout in seconds. Defaults to 4 hours if not specified.' }
);
const SCRIPT_ARGUMENTS_REQUIRED_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptArgumentsRequiredHelpText',
  { defaultMessage: 'Selected script requires arguments to be provided' }
);

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

    const fieldConfig: FieldConfig<AutomatedRunScriptConfig> = useMemo(() => {
      const config: FieldConfig<AutomatedRunScriptConfig> = {
        defaultValue: {
          linux: { scriptId: '', scriptInput: '', timeout: undefined },
          macos: { scriptId: '', scriptInput: '', timeout: undefined },
          windows: { scriptId: '', scriptInput: '', timeout: undefined },
        },
        validations: [
          {
            validator: ({ value }) => {
              const isInvalid =
                !value.linux.scriptId && !value.macos.scriptId && !value.windows.scriptId;

              if (isInvalid) {
                return {
                  code: 'invalid_script_id',
                  isInvalid: true,
                  message: RUNSCRIPT_CONFIG_REQUIRES_ONE_OS,
                };
              }
            },
          },
        ],
      };

      return config;
    }, []);

    if (!isAutomatedRunsScriptEnabled) {
      return null;
    }

    return (
      <>
        <EuiSpacer />
        <UseField<AutomatedRunScriptConfig>
          path={`${basePath}.config`}
          component={AutomatedRunScriptConfiguration}
          componentProps={{ 'data-test-subj': 'runscript-config-field' }}
          config={fieldConfig}
          isDisabled={disabled}
          readDefaultValueOnForm={readDefaultValueOnForm}
        />
      </>
    );
  }
);
RunscriptConfig.displayName = 'RunscriptConfig';

export interface AutomatedRunScriptConfigurationProps {
  field: FieldHook<AutomatedRunScriptConfig>;
  'data-test-subj'?: string;
}

export const AutomatedRunScriptConfiguration = memo<AutomatedRunScriptConfigurationProps>(
  (props) => {
    const { field, 'data-test-subj': dataTestSubj } = props;
    const { onChange: fieldOnChange, value } = field;
    const getTestId = useTestIdGenerator(dataTestSubj);
    const userHasRunScriptAuthz = useUserPrivileges().endpointPrivileges.canWriteExecuteOperations;

    const emitChange = useCallback(
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

    if (!userHasRunScriptAuthz) {
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
                  <EuiSpacer size="s" />
                  <RunScriptOsTypeConfig
                    platform={osType}
                    showFieldLabels={index === 0}
                    config={value[osType]}
                    data-test-subj={getTestId(osType)}
                    onChange={(updatedConfig) => {
                      emitChange({
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
  }
);
AutomatedRunScriptConfiguration.displayName = 'AutomatedRunScriptConfiguration';

export interface RunScriptOsTypeConfigProps {
  'data-test-subj'?: string;
  platform: SupportedHostOsType;
  config: EndpointRunScriptActionRequestParams;
  onChange: (updatedConfig: EndpointRunScriptActionRequestParams) => void;
  /** If `true` (default) each field will include a label */
  showFieldLabels?: boolean;
}

/** @private */
const RunScriptOsTypeConfig = memo<RunScriptOsTypeConfigProps>(
  ({ config, onChange, 'data-test-subj': dataTestSubj, platform, showFieldLabels = true }) => {
    const [scriptSelected, setSelectedScript] = useState<EndpointScript | undefined>(undefined);

    // TODO:PT maybe allow timeout to be entered using the `1h, 10m` etc. type of format and convert it to seconds for API call?

    const scriptSelectionOnChangeHandler: EndpointRunscriptScriptSelectorProps['onChange'] =
      useCallback(
        (selectedScript) => {
          if (selectedScript?.id !== config.scriptId) {
            onChange({
              ...config,
              scriptId: selectedScript?.id ?? '',
              // reset script input ++ timeout if no script is selected
              ...(!selectedScript ? { scriptInput: '', timeout: undefined } : {}),
            });
          }

          setSelectedScript(selectedScript);
        },
        [config, onChange]
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
        onChange({
          ...config,
          scriptInput: ev.target.value ?? '',
        });
      },
      [config, onChange]
    );

    const scriptTimeoutOnChangeHandler: Required<EuiFieldTextProps>['onChange'] = useCallback(
      (ev) => {
        onChange({
          ...config,
          timeout: ev.target.value ? Number(ev.target.value) : undefined,
        });
      },
      [config, onChange]
    );

    return (
      <EuiFlexGroup
        key={platform}
        gutterSize="s"
        alignItems="flexStart"
        justifyContent="spaceBetween"
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace={showFieldLabels}>
            <EuiFlexGroup
              responsive={false}
              wrap={false}
              gutterSize="s"
              alignItems="center"
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
        <EuiFlexItem>
          <EuiFormRow
            label={showFieldLabels ? SCRIPT_SELECTION_LABEL : undefined}
            helpText={
              // FIXME:PT implement way to view script definition details - use component from Ash's PR
              scriptSelected ? 'TBD: Click here to view script definition details' : undefined
            }
          >
            <EndpointRunscriptScriptSelector
              selectedScriptId={config.scriptId}
              osType={platform}
              onChange={scriptSelectionOnChangeHandler}
              onScriptsLoaded={scriptSelectionOnScriptsLoadedHandler}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={showFieldLabels ? SCRIPT_ARGUMENTS_LABEL : undefined}
            labelAppend={
              showFieldLabels && !scriptSelected?.requiresInput ? (
                <EuiText size="xs">{OPTIONAL_FIELD_LABEL}</EuiText>
              ) : undefined
            }
            helpText={
              scriptSelected?.requiresInput ? SCRIPT_ARGUMENTS_REQUIRED_HELP_TEXT : undefined
            }
          >
            <EuiFieldText
              name="scriptParms"
              disabled={!scriptSelected}
              value={config.scriptInput}
              fullWidth
              onChange={scriptParamsOnChangeHandler}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
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
          >
            <EuiFieldText
              name="timeout"
              disabled={!scriptSelected}
              fullWidth
              onChange={scriptTimeoutOnChangeHandler}
              value={config.timeout ?? ''}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
RunScriptOsTypeConfig.displayName = 'RunscriptOsTypeConfig';
