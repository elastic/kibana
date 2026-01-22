/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentProps, memo, useCallback, useMemo } from 'react';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { EuiFieldTextProps } from '@elastic/eui';
import {
  EuiIconTip,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useTestIdGenerator } from '../../../management/hooks/use_test_id_generator';
import type { EndpointRunScriptActionRequestParams } from '../../../../common/api/endpoint';
import type { AutomatedRunScriptConfig } from '../../../../common/endpoint/types';
import type { EndpointRunscriptScriptSelectorProps } from '../../../management/components/endpoint_runscript_script_selector';
import { EndpointRunscriptScriptSelector } from '../../../management/components/endpoint_runscript_script_selector';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { CONSOLE_COMMANDS, OS_TITLES } from '../../../management/common/translations';
import { PlatformIcon } from '../../../management/components/endpoint_responder/components/header_info/platforms';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import type { SupportedHostOsType } from '../../../../common/endpoint/constants';

const SCRIPT_SELECTION_LABEL = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptSeletionLabel',
  { defaultMessage: 'Script' }
);
const SCRIPT_ARGUMENTS_LABEL = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptArgumentsLabel',
  { defaultMessage: 'Script arguments (optional)' }
);
const SCRIPT_TIMEOUT_LABEL = i18n.translate(
  'xpack.securitySolution.runscriptConfig.scriptTimeoutLabel',
  { defaultMessage: 'Timeout' }
);

const TIMEOUT_TOOLTIP_CONTENT = i18n.translate(
  'xpack.securitySolution.runscriptConfig.timeoutTooltipContent',
  { defaultMessage: 'Script execution timeout in seconds' }
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

    const fieldConfig: ComponentProps<typeof UseField<AutomatedRunScriptConfig>>['config'] =
      useMemo(() => {
        return {
          defaultValue: {
            linux: { scriptId: '', scriptInput: '', timeout: undefined },
            macos: { scriptId: '', scriptInput: '', timeout: undefined },
            windows: { scriptId: '', scriptInput: '', timeout: undefined },
          },
          label: CONSOLE_COMMANDS.runscript.title,
        };
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
    const { onChange, value } = field;
    const getTestId = useTestIdGenerator(dataTestSubj);
    const [data] = useFormData();
    const userHasRunScriptAuthz = useUserPrivileges().endpointPrivileges.canWriteExecuteOperations;

    const emitChange = useCallback(
      (newValue: AutomatedRunScriptConfig) => {
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

    return (
      <EuiText size="s" data-test-subj={dataTestSubj}>
        <EuiSpacer />

        {(['linux', 'macos', 'windows'] as Array<keyof AutomatedRunScriptConfig>).map(
          (osType, index) => {
            return (
              <RunScriptOsTypeConfig
                key={osType}
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
    const scriptSelectionOnChangeHandler: EndpointRunscriptScriptSelectorProps['onChange'] =
      useCallback(
        (selectedScript) => {
          onChange({
            ...config,
            scriptId: selectedScript?.id ?? '',
          });
        },
        [config, onChange]
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
      <EuiFormRow fullWidth data-test-subj={dataTestSubj}>
        <EuiFlexGroup
          key={platform}
          gutterSize="s"
          alignItems="center"
          justifyContent="spaceBetween"
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
            <EuiFormRow label={showFieldLabels ? SCRIPT_SELECTION_LABEL : undefined}>
              <EndpointRunscriptScriptSelector
                selectedScriptId={config.scriptId}
                osType={platform}
                onChange={scriptSelectionOnChangeHandler}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label={showFieldLabels ? SCRIPT_ARGUMENTS_LABEL : undefined}>
              <EuiFieldText name="scriptParms" fullWidth onChange={scriptParamsOnChangeHandler} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={showFieldLabels ? SCRIPT_TIMEOUT_LABEL : undefined}
              labelAppend={
                showFieldLabels ? (
                  <EuiIconTip content={<EuiText size="xs">{TIMEOUT_TOOLTIP_CONTENT}</EuiText>} />
                ) : undefined
              }
            >
              <EuiFieldText name="timeout" fullWidth onChange={scriptTimeoutOnChangeHandler} />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    );
  }
);
RunScriptOsTypeConfig.displayName = 'RunscriptOsTypeConfig';
