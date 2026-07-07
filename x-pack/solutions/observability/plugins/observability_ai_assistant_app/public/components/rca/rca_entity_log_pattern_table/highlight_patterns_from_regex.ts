/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function addCapturingGroupsToRegex(regex: string): string {
  // Match all parts of the regex that are not special characters
  // We treat constant parts as sequences of characters that are not part of regex syntax
  return regex.replaceAll(/((?:\.\*\?)|(?:\.\+\?)|(?:\+\?))/g, (...args) => {
    return `(${args[1]})`;
  });
}

export function highlightPatternFromRegex(pattern: string, str: string): string {
  // First, add non-capturing groups to the regex around constant parts
  const updatedPattern = addCapturingGroupsToRegex(pattern);

  const regex = new RegExp(updatedPattern, 'ds');

  const matches = str.match(regex) as
    | (RegExpMatchArray & { indices: Array<[number, number]> })
    | null;

  const slices: string[] = [];

  matches?.forEach((_, index) => {
    if (index === 0) {
      return;
    }

    const [, prevEnd] = index > 1 ? matches?.indices[index - 1] : [undefined, undefined];
    const [start, end] = matches?.indices[index];

    const literalSlice = prevEnd !== undefined ? str.slice(prevEnd, start) : undefined;

    if (literalSlice) {
      slices.push(`<em>${literalSlice}</em>`);
    }

    const slice = str.slice(start, end);
    slices.push(slice);

    if (index === matches.length - 1) {
      slices.push(str.slice(end));
    }
  });

  return slices.join('');
}
