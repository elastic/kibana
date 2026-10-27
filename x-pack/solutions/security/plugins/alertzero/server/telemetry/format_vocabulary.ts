/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Renders a closed vocabulary for a field description, so descriptions track the enums. */
export const formatVocabulary = (values: readonly string[]): string => {
  const quoted = values.map((value) => `\`${value}\``);
  if (quoted.length <= 1) {
    return quoted.join('');
  }
  return `${quoted.slice(0, -1).join(', ')} or ${quoted[quoted.length - 1]}`;
};
