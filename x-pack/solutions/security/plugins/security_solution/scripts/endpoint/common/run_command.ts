/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execa, parseCommandString, type Options, type ResultPromise } from 'execa';

export const runCommand = <NewOptionsType extends Options = {}>(
  command: string,
  options?: NewOptionsType
): ResultPromise<{} & NewOptionsType> => {
  const [file, ...args] = parseCommandString(command);
  return execa(file, args, options);
};
