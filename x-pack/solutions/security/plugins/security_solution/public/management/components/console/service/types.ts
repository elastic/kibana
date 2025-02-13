/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export type PossibleArgDataTypes = string | boolean;
export type ParsedArgData<T = PossibleArgDataTypes> = Array<
  T extends PossibleArgDataTypes ? T : never
>;

export interface ParsedCommandInput<TArgs extends object = any> {
  name: string;
  args: {
    [key in keyof TArgs]: ParsedArgData<Required<TArgs>[key]>;
  };
}

export interface ParsedCommandInterface<TArgs extends object = any>
  extends ParsedCommandInput<TArgs> {
  input: string;

  /**
   * Checks if the given argument name was entered by the user
   * @param argName
   */
  hasArg(argName: string): boolean;

  /**
   * if any argument was entered
   */
  hasArgs: boolean;
}
