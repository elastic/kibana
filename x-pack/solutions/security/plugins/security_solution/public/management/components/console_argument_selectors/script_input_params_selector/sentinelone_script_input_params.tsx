/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { SentinelOneRunScriptActionParameters } from '../../endpoint_responder/command_render_components/run_script_action';
import type { CustomScriptSelectorState } from '../custom_scripts_selector/custom_script_selector';
import type { SentinelOneScript } from '../../../../../common/endpoint/types';
import { TextareaInputArgument } from '../textarea_input_argument';
import type { TextareaInputArgumentProps } from '../textarea_input_argument';

export const SentinelOneScriptInputParams = memo<
  TextareaInputArgumentProps<
    SentinelOneRunScriptActionParameters,
    { script: CustomScriptSelectorState<SentinelOneScript> }
  >
>((props) => {
  const enteredCommand = props.command;

  const customizedProps: Pick<
    TextareaInputArgumentProps,
    | 'helpContent'
    | 'openLabel'
    | 'noInputEnteredMessage'
    | 'textareaLabel'
    | 'textareaPlaceholderLabel'
  > = useMemo(() => {
    const selectedScript = enteredCommand.argState?.script?.at(0)?.store?.selectedOption;

    return {
      helpContent: selectedScript?.meta?.inputInstructions || undefined,

      openLabel: i18n.translate(
        'xpack.securitySolution.sentineloneScriptInputParams.openInputParamsMessage',
        { defaultMessage: 'Click to enter input parameters for selected script' }
      ),
      noInputEnteredMessage: i18n.translate(
        'xpack.securitySolution.sentineloneScriptInputParams.noParamsEntered',
        { defaultMessage: 'Input parameters empty' }
      ),
      textareaLabel: i18n.translate(
        'xpack.securitySolution.sentineloneScriptInputParams.inputParamsLabel',
        { defaultMessage: 'Script input parameters' }
      ),
      textareaPlaceholderLabel: i18n.translate(
        'xpack.securitySolution.sentineloneScriptInputParams.scriptInputParamsPlaceholder',
        {
          defaultMessage: 'Enter parameters for {scriptName}',
          values: {
            scriptName:
              selectedScript?.name ||
              i18n.translate('xpack.securitySolution.sentineloneScriptInputParams.script', {
                defaultMessage: 'script',
              }),
          },
        }
      ),
    };
  }, [enteredCommand.argState?.script]);

  return <TextareaInputArgument {...props} {...customizedProps} />;
});
SentinelOneScriptInputParams.displayName = 'SentinelOneScriptInputParams';
