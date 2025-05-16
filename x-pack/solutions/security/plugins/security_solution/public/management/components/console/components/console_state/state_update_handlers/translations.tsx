/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ReactNode } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { ConsoleCodeBlock } from '../../console_code_block';

export const executionTranslations = Object.freeze({
  mustHaveValue: (argName: string): string => {
    return i18n.translate('xpack.securitySolution.console.commandValidation.mustHaveValue', {
      defaultMessage: 'Argument --{argName} must have a value',
      values: { argName },
    });
  },

  mustBeNumber: (argName: string): string => {
    return i18n.translate('xpack.securitySolution.console.commandValidation.mustBeNumber', {
      defaultMessage: 'Argument --${argName} value must be a number',
      values: { argName },
    });
  },

  mustBeGreaterThanZero: (argName: string): string => {
    return i18n.translate(
      'xpack.securitySolution.console.commandValidation.mustBeGreaterThanZero',
      {
        defaultMessage: 'Argument --{argName} value must be greater than zero',
        values: { argName },
      }
    );
  },

  NO_ARGUMENTS_SUPPORTED: i18n.translate(
    'xpack.securitySolution.console.commandValidation.noArgumentsSupported',
    {
      defaultMessage: 'Command does not support any arguments',
    }
  ),

  missingRequiredArg: (argName: string): string => {
    return i18n.translate('xpack.securitySolution.console.commandValidation.missingRequiredArg', {
      defaultMessage: 'Missing required argument: --{argName}',
      values: {
        argName,
      },
    });
  },

  unsupportedArg: (argName: string): string => {
    return i18n.translate('xpack.securitySolution.console.commandValidation.unsupportedArg', {
      defaultMessage: 'Unsupported argument: --{argName}',
      values: { argName },
    });
  },

  noMultiplesAllowed: (argName: string): string => {
    return i18n.translate('xpack.securitySolution.console.commandValidation.argSupportedOnlyOnce', {
      defaultMessage: 'Argument can only be used once: --{argName}',
      values: { argName },
    });
  },

  argValueValidatorError: (argName: string, error: string): string => {
    return i18n.translate('xpack.securitySolution.console.commandValidation.invalidArgValue', {
      defaultMessage: 'Invalid argument value: --{argName}. {error}',
      values: { argName, error },
    });
  },

  missingArguments: (missingArgs: string): string => {
    return i18n.translate('xpack.securitySolution.console.commandValidation.mustHaveArgs', {
      defaultMessage: 'Missing required arguments: {missingArgs}',
      values: { missingArgs },
    });
  },

  MUST_HAVE_AT_LEAST_ONE_ARG: i18n.translate(
    'xpack.securitySolution.console.commandValidation.oneArgIsRequired',
    {
      defaultMessage: 'At least one argument must be used',
    }
  ),

  onlyOneFromExclusiveOr: (argNames: string): ReactNode => {
    return (
      <ConsoleCodeBlock>
        <FormattedMessage
          id="xpack.securitySolution.console.commandValidation.exclusiveOr"
          defaultMessage="This command supports only one of the following arguments: {argNames}"
          values={{
            argNames: (
              <ConsoleCodeBlock bold inline>
                {argNames}
              </ConsoleCodeBlock>
            ),
          }}
        />
      </ConsoleCodeBlock>
    );
  },

  unknownArgument: (count: number, commandName: string, unknownArgs: string): ReactNode => {
    return (
      <ConsoleCodeBlock>
        <FormattedMessage
          id="xpack.securitySolution.console.commandValidation.unknownArgument"
          defaultMessage="The following {command} {countOfInvalidArgs, plural, =1 {argument is} other {arguments are}} not supported by this command: {unknownArgs}"
          values={{
            countOfInvalidArgs: count,
            command: (
              <ConsoleCodeBlock bold inline>
                {commandName}
              </ConsoleCodeBlock>
            ),
            unknownArgs: (
              <ConsoleCodeBlock bold inline>
                {unknownArgs}
              </ConsoleCodeBlock>
            ),
          }}
        />
      </ConsoleCodeBlock>
    );
  },
});
