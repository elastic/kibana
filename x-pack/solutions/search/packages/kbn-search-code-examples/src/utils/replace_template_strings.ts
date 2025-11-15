/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Variables that can be used in console tutorials
 */
export interface ConsoleTutorialVariables {
  inference_endpoints_url?: string;
  search_playground_url?: string;
  search_applications_url?: string;
}

/**
 * Replaces template variables in console tutorial text.
 * Uses single brace syntax: {variable_name}
 *
 * @param text - The tutorial text containing template variables
 * @param variables - Object containing variable values to replace
 * @returns The text with variables replaced
 *
 * @example
 * ```typescript
 * const tutorial = replaceConsoleTutorialStrings(
 *   '# Visit: {search_playground_url}',
 *   { search_playground_url: 'http://localhost:5601/app/search_playground' }
 * );
 * // Returns: '# Visit: http://localhost:5601/app/search_playground'
 * ```
 */
export function replaceConsoleTutorialStrings(
  text: string,
  variables: ConsoleTutorialVariables
): string {
  let result = text;

  // Replace each variable
  Object.entries(variables).forEach(([key, value]) => {
    if (value) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    }
  });

  return result;
}
