/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { upperFirst } from 'lodash';
import type { RunScriptActionRequestBody } from '../../../../../../common/api/endpoint';

export const mapParametersToCrowdStrikeArguments = (
  commandName: string,
  parameters: RunScriptActionRequestBody['parameters']
): string => {
  // Map each parameter to the required syntax and join them with spaces
  // In short: this function has to transform the parameters object into a string that can be used as a CS command
  // One word commands eg. 'ls' can go as it is, but if there are more elements eg. 'ls -l', they have to be wrapped in triple backticks
  const commandParts = Object.entries(parameters).map(([key, value]) => {
    // Check and process the parameter value
    let sanitizedValue;
    if (typeof value === 'string') {
      if (/^```.*```$/.test(value)) {
        // If already wrapped in triple backticks, leave unchanged
        sanitizedValue = value;
      } else {
        const strippedValue = value.trim(); // Remove spaces at the beginning and end
        if (strippedValue.split(/\s+/).length === 1) {
          // If it's a single element (no spaces), use it as-is
          sanitizedValue = strippedValue;
        } else {
          // If parameter is raw and it contains multiple elements (spaces), wrap in ```
          const wrappedValue =
            key === 'raw' ? `\`\`\`${strippedValue}\`\`\`` : `'${strippedValue}'`;

          sanitizedValue = wrappedValue;
        }
      }
    } else {
      sanitizedValue = value;
    }
    return `--${upperFirst(key)}=${sanitizedValue}`;
  });

  // Combine the base command with the constructed parameters
  return `${commandName} ${commandParts.join(' ')}`;
};
