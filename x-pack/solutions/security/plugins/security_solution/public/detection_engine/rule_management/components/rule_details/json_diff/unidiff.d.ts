/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface Change {
  count?: number | undefined;
  value: string;
  added?: boolean | undefined;
  removed?: boolean | undefined;
}

type ADDED = 'ADDED';
type REMOVED = 'REMOVED';
type UNMODIFIED = 'UNMODIFIED';

type LineChangeType = ADDED | REMOVED | UNMODIFIED;

declare module 'unidiff' {
  export interface FormatOptions {
    context?: number;
  }

  export function diffLines(x: string, y: string): Change[];

  export function formatLines(line: Change[], options?: FormatOptions): string;
}

declare module 'unidiff/hunk' {
  export const ADDED: ADDED;
  export const REMOVED: REMOVED;
  export const UNMODIFIED: UNMODIFIED;

  export type ChangeWithType = Change & { type: LineChangeType };

  export interface LineChange {
    type: LineChangeType;
    text: string;
    unified(): string;
  }

  export interface UniDiffHunk {
    aoff: number;
    boff: number;
    changes: LineChange[];
    unified(): string;
  }

  export function lineChanges(change: ChangeWithType): LineChange[];

  export function hunk(aOffset: number, bOffset: number, lchanges: LineChange[]): UniDiffHunk;
}
