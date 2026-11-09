/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const HEADING = /^#{2,}\s+\S/;

const levelOf = (heading: string): number => heading.length - heading.replace(/^#+/, '').length;

/**
 * Removes a markdown section whose heading has no text under it, such as the `## Tool failures`
 * heading the optimizer leaves on an integration page that has none to report. A heading that only
 * introduces deeper headings is kept, and so is a section holding anything else, including a fenced
 * block.
 */
export const dropEmptySections = (content: string): string => {
  const lines = content.split('\n');
  const keep = lines.map(() => true);

  lines.forEach((line, index) => {
    if (!HEADING.test(line)) {
      return;
    }
    for (let next = index + 1; next < lines.length; next++) {
      const text = lines[next];
      if (HEADING.test(text)) {
        if (levelOf(text) > levelOf(line)) {
          return;
        }
        break;
      }
      if (text.trim() !== '') {
        return;
      }
    }
    keep[index] = false;
  });

  return lines
    .filter((_, index) => keep[index])
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
