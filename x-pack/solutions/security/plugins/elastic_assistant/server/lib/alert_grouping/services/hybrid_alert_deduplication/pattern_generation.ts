/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pattern generation utilities for the Hybrid Alert Deduplication system.
 *
 * Automatically creates wildcard patterns from clustered alerts to match
 * future similar alerts without requiring LLM calls. This significantly
 * reduces cost and latency for recurring alert types.
 *
 * Ported from https://github.com/elastic/alert-clustering
 */

import { TRIAGE_FIELDS } from './types';
import type { AlertDocument, ExceptionPattern } from './types';
import { getVal } from './utils';

// ============================================================
// Wildcard matching
// ============================================================

/**
 * Match a string against a wildcard pattern where `*` matches 0+ characters.
 * All other characters are treated as literals (case-insensitive).
 */
export const wildmatch = (searchString: string, pattern: string): boolean => {
  // Escape all regex metacharacters
  let escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Replace escaped asterisks back with regex equivalent
  escaped = escaped.replace(/\\\*/g, '.*');

  // Match the entire string (anchored at start and end)
  const regexPattern = `^${escaped}$`;
  return new RegExp(regexPattern, 's').test(searchString);
};

// ============================================================
// Exception list matching
// ============================================================

/**
 * Check if an alert matches an exception list pattern.
 * An exception pattern is a list of (field, wildcardPattern) tuples.
 * All patterns must match for the exception to apply.
 */
export const exceptionlistMatch = (alert: AlertDocument, exception: ExceptionPattern): boolean => {
  for (const [key, pattern] of exception) {
    let v = getVal(alert, key);
    if (v == null) {
      return false;
    }

    let patternVal = pattern;

    // Handle arrays (take first element)
    if (Array.isArray(patternVal)) {
      patternVal = String(patternVal[0]);
    }
    if (Array.isArray(v)) {
      v = v[0];
    }

    const vStr = String(v).toLowerCase();
    const patternStr = String(patternVal).toLowerCase();

    if (!wildmatch(vStr, patternStr)) {
      return false;
    }
  }

  return true;
};

/**
 * Verify that an exception pattern matches ALL alerts in a set for a specific field.
 */
const exceptionQaAlerts = (alerts: AlertDocument[], field: string, pattern: string): boolean => {
  for (const alert of alerts) {
    if (!exceptionlistMatch(alert, [[field, pattern]])) {
      return false;
    }
  }
  return true;
};

// ============================================================
// Longest common substring
// ============================================================

/**
 * Find the shortest string length in an array of strings.
 */
const shortestStringLen = (strings: string[]): number => {
  let length = 0;
  for (const s of strings) {
    if (length === 0 || s.length < length) {
      length = s.length;
    }
  }
  return length;
};

/**
 * Find the longest common substring across all strings (case-insensitive).
 *
 * Searches from left to right positions first, then by decreasing length,
 * to find the leftmost, longest common substring.
 *
 * @param strings - Array of strings to search
 * @param minSubstr - Minimum substring length to consider
 * @returns The longest common substring, or empty string if none found
 */
export const longestCommonSubstring = (strings: string[], minSubstr: number): string => {
  if (strings.length === 0) {
    return '';
  }

  const shortestString = strings.reduce((a, b) => (a.length <= b.length ? a : b));
  const shortestLen = shortestString.length;

  // Convert all strings to lowercase for case-insensitive comparison
  const stringsLower = strings.map((s) => s.toLowerCase());
  const shortestStringLower = shortestString.toLowerCase();

  // Try positions from left to right FIRST, then by decreasing length
  for (let i = 0; i < shortestString.length; i++) {
    for (let length = shortestString.length - i; length >= minSubstr; length--) {
      if (i + length <= shortestString.length) {
        const substring = shortestString.slice(i, i + length); // Original case
        const substringLower = shortestStringLower.slice(i, i + length); // For comparison

        if (!substring.startsWith('\x00') && !substring.endsWith('\x00')) {
          if (substring.length < Math.min(minSubstr, shortestLen)) {
            break; // No point checking shorter lengths at this position
          }

          if (stringsLower.every((s) => s.includes(substringLower))) {
            return substring;
          }
        }
      }
    }
  }

  return '';
};

// ============================================================
// Match pattern generation
// ============================================================

/**
 * Generate wildcard match patterns from a set of clustered alerts.
 *
 * For each triage field (plus any additional common fields), this finds
 * the longest common substrings across all alerts and builds a wildcard
 * pattern like `*common1*common2*` that matches all alerts in the cluster.
 *
 * The generated patterns serve as fast-path exception lists: future alerts
 * matching these patterns can be clustered without an LLM call.
 *
 * @param alerts - Alerts in the cluster
 * @param additionalFields - Extra fields to include (from LLM common_fields)
 * @returns Exception pattern or undefined if no useful pattern found
 */
export const generateMatchPattern = (
  alerts: AlertDocument[],
  additionalFields?: string[]
): ExceptionPattern | undefined => {
  const featureFields: string[] = [...TRIAGE_FIELDS];

  for (const f of additionalFields ?? []) {
    if (!featureFields.includes(f)) {
      featureFields.push(f);
    }
  }

  // Remove fields that don't have values in all alerts
  const skipFields: string[] = [];
  for (const alert of alerts) {
    for (const f of TRIAGE_FIELDS) {
      if (!skipFields.includes(f)) {
        const v = getVal(alert, f);
        if (v == null) skipFields.push(f);
      }
    }
  }
  for (const f of skipFields) {
    const idx = featureFields.indexOf(f);
    if (idx >= 0) featureFields.splice(idx, 1);
  }

  if (featureFields.length === 0) {
    return undefined;
  }

  const exception: ExceptionPattern = [];

  for (const f of featureFields) {
    let values = alerts.map((alert) => String(getVal(alert, f)));

    let pattern = '*';

    while (true) {
      // Find next common substring
      const shortestLen = shortestStringLen(values);
      const minSubstr = Math.min(6, shortestLen);
      const substr = longestCommonSubstring(values, minSubstr);

      if (!substr) {
        break;
      }

      // Add the substring to the pattern
      pattern += `${substr}*`;

      // Replace the found substring in all values with null bytes
      // so it won't be found again in subsequent iterations
      const substrRegex = new RegExp(substr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      values = values.map((v) => v.replace(substrRegex, '\x00'.repeat(substr.length)));
    }

    // Normalize consecutive wildcards
    if (pattern.length > 256) {
      pattern = `${pattern.slice(0, 256)}*`;
    }
    while (pattern.includes('**')) {
      pattern = pattern.replace(/\*\*/g, '*');
    }

    if (pattern !== '*') {
      // Prune start/end wildcards if the pattern still matches all alerts
      if (pattern.startsWith('*') && exceptionQaAlerts(alerts, f, pattern.slice(1))) {
        pattern = pattern.slice(1);
      }
      if (pattern.endsWith('*') && exceptionQaAlerts(alerts, f, pattern.slice(0, -1))) {
        pattern = pattern.slice(0, -1);
      }

      // Final QA: verify the pattern matches all alerts
      if (exceptionQaAlerts(alerts, f, pattern)) {
        exception.push([f, pattern]);
      }
    }
  }

  return exception.length > 0 ? exception : undefined;
};
