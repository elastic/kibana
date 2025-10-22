/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ScriptHelpContent } from './shared/script_help_content';
import type { ResponseActionScript } from '../../../../../common/endpoint/types';
import type { CrowdStrikeRunScriptActionParameters } from '../../endpoint_responder/command_render_components/run_script_action';
import type { TextareaInputArgumentProps } from '../textarea_input_argument';
import { TextareaInputArgument } from '../textarea_input_argument';

export const CrowdstrikeScriptInputParams = memo<
  TextareaInputArgumentProps<
    CrowdStrikeRunScriptActionParameters,
    { CloudFile: { selectedOption: ResponseActionScript } }
  >
>((props) => {
  const args = props.command.args?.args;

  const scriptName = useMemo(() => {
    if (args.HostPath) {
      return args.HostPath[0];
    }

    if (args.CloudFile) {
      return args.CloudFile[0];
    }

    return '';
  }, [args.CloudFile, args.HostPath]);

  const scriptHelp = useMemo(() => {
    if (args.CloudFile) {
      return props.command.argState?.CloudFile?.at(0)?.store?.selectedOption?.description;
    }

    return '';
  }, [args.CloudFile, props.command.argState?.CloudFile]);

  const customizedProps: Pick<
    TextareaInputArgumentProps,
    | 'helpContent'
    | 'openLabel'
    | 'noInputEnteredMessage'
    | 'textareaLabel'
    | 'textareaPlaceholderLabel'
  > = useMemo(() => {
    return {
      helpContent: scriptHelp ? <ScriptHelpContent description={scriptHelp} /> : undefined,

      textareaLabel: i18n.translate(
        'xpack.securitySolution.crowdstrikeScriptInputParams.textareaLabel',
        { defaultMessage: 'Script command line arguments' }
      ),
      textareaPlaceholderLabel: i18n.translate(
        'xpack.securitySolution.crowdstrikeScriptInputParams.textareaPlaceholderLabel',
        {
          defaultMessage: 'Enter command line arguments for {scriptName}',
          values: {
            scriptName:
              scriptName ||
              i18n.translate('xpack.securitySolution.crowdstrikeScriptInputParams.script', {
                defaultMessage: 'script',
              }),
          },
        }
      ),
    };
  }, [scriptHelp, scriptName]);

  return <TextareaInputArgument {...props} {...customizedProps} />;
});
CrowdstrikeScriptInputParams.displayName = 'CrowdstrikeScriptInputParams';
