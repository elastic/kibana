/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MAX_MESSAGE_LENGTH = 500;

/** Strips file system paths that may contain private directory structure. */
const stripFilePaths = (message: string): string =>
  message.replace(/(?:\/Users\/|\/home\/|node_modules\/)[^\s,)'"]+/g, '[path]');

/** Strips stack trace lines (lines starting with optional whitespace then "at "). */
const stripStackTraceLines = (message: string): string =>
  message
    .split('\n')
    .filter((line) => !/^\s+at\s/.test(line))
    .join('\n')
    .trim();

/**
 * Sanitizes an error message for inclusion in the diagnostic report.
 * - Strips file system paths to prevent leaking local directory structure.
 * - Strips stack trace lines.
 * - Truncates messages longer than 500 characters.
 */
export const sanitizeErrorMessage = (message: string): string => {
  let result = stripFilePaths(message);
  result = stripStackTraceLines(result);

  if (result.length > MAX_MESSAGE_LENGTH) {
    result = `${result.slice(0, MAX_MESSAGE_LENGTH)}...`;
  }

  return result;
};
