/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import type { ParsedCommandInterface } from '../console/service/types';
import { getCommandListMock } from '../console/mocks';
import type { CommandArgumentValueSelectorProps } from '../console/types';

const buildCommandArgumentValueSelectorPropsMock = <
  T extends CommandArgumentValueSelectorProps = CommandArgumentValueSelectorProps
>(
  overrides: DeepPartial<T> = {}
): jest.Mocked<T> => {
  const commandDefinition =
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    (overrides?.command?.commandDefinition ??
      // `cmd3` is a testing command that has an argument selector by default
      getCommandListMock().find(({ name }) => name === 'cmd3'))!;
  const commandArgNames = Object.keys(commandDefinition?.args ?? {});
  const firstArgName = commandArgNames.at(0) ?? 'foo';
  const commandInput = `${commandDefinition.name} --${firstArgName}`;

  const propsMock = {
    value: undefined,
    valueText: '',
    store: undefined,
    argName: firstArgName,
    argIndex: 0,
    onChange: jest.fn((newState) => {
      // Assign the new state back to this `propsMock` - to support a `rerender()`
      Object.assign(propsMock, newState);
    }),
    command: {
      input: commandInput,
      inputDisplay: commandInput,
      args: {
        input: commandInput,
        hasArg: jest.fn().mockReturnValue(true),
        hasArgs: true,
        args: commandArgNames.reduce((acc, argName) => {
          acc[argName] = [];
          return acc;
        }, {} as ParsedCommandInterface['args']),
      },
      commandDefinition,
    },
    requestFocus: jest.fn(),
  };

  return merge(propsMock, overrides) as unknown as jest.Mocked<T>;
};

/**
 * Reusable mocks for response console argument value selector components
 */
export const consoleArgumentValueSelectorMocks = Object.freeze({
  buildCommandArgumentValueSelectorProps: buildCommandArgumentValueSelectorPropsMock,
});
