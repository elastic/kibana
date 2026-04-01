/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const addTrailingBackticksIfNecessary = (text: string): string => {
  const leadingJSONpattern = /^\w*```json(.*?)/s;
  const trailingBackticksPattern = /(.*?)```\w*$/s;

  const hasLeadingJSONWrapper = leadingJSONpattern.test(text);
  const hasTrailingBackticks = trailingBackticksPattern.test(text);

  if (hasLeadingJSONWrapper && !hasTrailingBackticks) {
    return `${text}\n\`\`\``;
  }

  return text;
};
