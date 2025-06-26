/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useConsoleStore } from '../../components/console_state/console_state';

/**
 * Retrieves the command name from the text the user entered. Will only return a value if a space
 * has been entered, which is the trigger to being able to actually parse out the command name
 */
export const useWithInputCommandEntered = (): string => {
  const parsedInput = useConsoleStore().state.input.parsedInput;

  return parsedInput.input.trimStart().indexOf(' ') !== -1 ? parsedInput.name : '';
};
