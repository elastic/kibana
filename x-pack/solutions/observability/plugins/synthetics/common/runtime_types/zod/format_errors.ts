/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject } from 'lodash';
import type { z } from '@kbn/zod';

type ZodIssue = z.ZodError['issues'][number];
type UnionIssue = ZodIssue & { errors: ZodIssue[][] };

const isUnionIssue = (issue: ZodIssue): issue is UnionIssue =>
  issue.code === 'invalid_union' && Array.isArray((issue as { errors?: unknown }).errors);

const isDiscriminatorIssue = (issue: ZodIssue): boolean =>
  issue.message.startsWith('Invalid discriminator value') ||
  ('note' in issue && issue.note === 'No matching discriminator');

const withParentPath = (parentPath: PropertyKey[], issue: ZodIssue): ZodIssue => {
  if (parentPath.length === 0 || issue.path.length > 0) {
    return issue;
  }
  return { ...issue, path: parentPath };
};

/**
 * `z.union` / `z.discriminatedUnion` nest the useful issue under `errors[][]`
 * and 400 with `Invalid input`. Unwrap discriminator misses; keep field-level
 * unions (locations, schedule) so we format the bad value at that path.
 */
export function flattenZodIssues(issues: ZodIssue[]): ZodIssue[] {
  const flattened: ZodIssue[] = [];
  for (const issue of issues) {
    if (!isUnionIssue(issue) || issue.errors.length === 0) {
      flattened.push(issue);
      continue;
    }
    const discriminatorBranch = issue.errors.find((group) => group.some(isDiscriminatorIssue));
    if (discriminatorBranch) {
      flattened.push(
        ...flattenZodIssues(discriminatorBranch).map((nested) => withParentPath(issue.path, nested))
      );
      continue;
    }
    if (issue.path.length > 0) {
      flattened.push(issue);
      continue;
    }
    const branch = issue.errors.find((group) => group.length > 0) ?? [];
    flattened.push(...flattenZodIssues(branch).map((nested) => withParentPath(issue.path, nested)));
  }
  return flattened;
}

/**
 * Mirrors `@kbn/securitysolution-io-ts-utils` `formatErrors` for zod issues so
 * API `details` strings stay stable across the io-ts → zod cutover.
 * https://github.com/elastic/kibana/blob/0cc78184957fcd12110dabae50353392ea937508/src/platform/packages/shared/kbn-securitysolution-io-ts-utils/src/format_errors/index.ts#L13-L36
 *
 * Prefer a codec's own message when present (custom refine / `error:` option);
 * otherwise render `Invalid value "…" supplied to "…"`. Zod v4 issues do not
 * carry the failing value, so callers pass the original `input` to recover it.
 * Empty paths use `rootName` (e.g. decoding `MonitorTypeCodec` alone → `"type"`).
 * Messages are sorted so multi-error `details` strings stay stable (zod issue
 * order follows object key order; io-ts/`formatErrors` ordered differently).
 */
export function formatZodIssue(
  issue: ZodIssue,
  { rootName = '', input }: { rootName?: string; input?: unknown } = {}
): string {
  if (issue.message != null && !isGenericZodMessage(issue.message)) {
    return issue.message;
  }

  // Match formatErrors: drop integer (array-index) path segments.
  const keyContext = issue.path
    .filter((entry) => typeof entry === 'string' && entry.trim() !== '')
    .join(',');

  const suppliedValue = keyContext !== '' ? keyContext : rootName;
  const raw = getAtPath(input, issue.path);
  const value = isObject(raw) ? JSON.stringify(raw) : raw;
  return `Invalid value "${value}" supplied to "${suppliedValue}"`;
}

export function formatZodErrors(
  error: z.ZodError,
  { rootName = '', input }: { rootName?: string; input?: unknown } = {}
): string[] {
  const messages = flattenZodIssues(error.issues).map((issue) =>
    formatZodIssue(issue, { rootName, input })
  );

  return [...new Set(messages)].sort();
}

/** Zod's built-in copy — keep those out of API details; prefer the Invalid value form. */
function isGenericZodMessage(message: string): boolean {
  return (
    message === 'Invalid input' ||
    message.startsWith('Invalid input:') ||
    message === 'Required' ||
    message.startsWith('Invalid option:') ||
    message.startsWith('Invalid enum value.') ||
    message.startsWith('Invalid discriminator value') ||
    message.startsWith('Expected ') ||
    message.startsWith('Invalid type:')
  );
}

function getAtPath(input: unknown, path: PropertyKey[]): unknown {
  let cur: unknown = input;
  for (const key of path) {
    if (cur == null || (typeof cur !== 'object' && typeof cur !== 'string')) {
      return cur;
    }
    cur = (cur as Record<PropertyKey, unknown>)[key];
  }
  return cur;
}
