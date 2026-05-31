/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionType, ActionIntent } from './types';

export const INTENT_PATTERNS: Array<{
  type: ActionType;
  patterns: RegExp[];
}> = [
  {
    type: 'isolate',
    patterns: [
      // Quoted hostname variant (backticks, single or double quotes) — checked first
      /(?<!\w)(?:isolate|quarantine|disconnect)\s+(?:host\s+)?[`'"](?<hostname>[^`'"]+)[`'"]/i,
      // Unquoted hostname: must not be preceded by a word char to avoid matching "unisolate"
      /(?<!\w)(?:isolate|quarantine|disconnect)\s+(?:the\s+)?(?:host\s+)?(?<hostname>[a-zA-Z0-9][a-zA-Z0-9_.-]*)/i,
    ],
  },
  {
    type: 'unisolate',
    patterns: [
      // Quoted hostname variant
      /(?:unisolate|release|reconnect|un-quarantine)\s+(?:host\s+)?[`'"](?<hostname>[^`'"]+)[`'"]/i,
      // Unquoted hostname
      /(?:unisolate|release|reconnect|un-quarantine)\s+(?:the\s+)?(?:host\s+)?(?<hostname>[a-zA-Z0-9][a-zA-Z0-9_.-]*)/i,
    ],
  },
];

/**
 * Parse natural language intent into a structured action intent.
 * Returns null when no matching pattern is found.
 */
export const parseIntent = (input: string): ActionIntent | null => {
  for (const { type, patterns } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      const match = pattern.exec(input);
      if (match && match.groups?.hostname) {
        const hostName = match.groups.hostname.trim();
        if (hostName.length > 0) {
          return {
            type,
            hostName,
            rawInput: input,
          };
        }
      }
    }
  }
  return null;
};
