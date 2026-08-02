/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A tripwire for copy the Brief no longer renders.
 *
 * Translated copy has no compiler and no linter behind it: deleting the component that
 * rendered a string leaves the string itself exporting cleanly forever, and a translator
 * goes on being asked for words nobody reads. This suite is what makes that a test
 * failure instead of an archaeology exercise.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { extname, join } from 'path';

const TRANSLATIONS_PATH = join(__dirname, 'translations.ts');
const PUBLIC_ROOT = join(__dirname, '..', '..');

/** Neither the file under scan nor this suite, which names the exports in order to judge them. */
const EXCLUDED_PATHS = [TRANSLATIONS_PATH, __filename];

const listSourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return listSourceFiles(path);
    }

    return ['.ts', '.tsx'].includes(extname(path)) && !EXCLUDED_PATHS.includes(path) ? [path] : [];
  });

/** Whole-identifier matches only, so `ANSWERED` is not found inside `ALREADY_ANSWERED_TOAST`. */
const countReferences = (source: string, name: string): number =>
  source.match(new RegExp(`(^|[^A-Za-z0-9_])${name}([^A-Za-z0-9_]|$)`, 'gm'))?.length ?? 0;

const translationsSource = readFileSync(TRANSLATIONS_PATH, 'utf8');

const exportedNames = Array.from(
  translationsSource.matchAll(/^export const ([A-Za-z0-9_]+)/gm),
  ([, name]) => name
);

const consumerSources = listSourceFiles(PUBLIC_ROOT).map((path) => readFileSync(path, 'utf8'));

/**
 * An export nothing reads. A single in-file occurrence is the declaration itself; a second one means
 * another export composes it.
 */
const orphanedExports = exportedNames.filter(
  (name) =>
    countReferences(translationsSource, name) === 1 &&
    !consumerSources.some((source) => countReferences(source, name) > 0)
);

describe('brief translations', () => {
  it('finds the exports it is scanning', () => {
    expect(exportedNames).toContain('PAGE_TITLE');
  });

  /** Annotation 11b: reversibility survives on the contract, for the modal's tone, not as copy. */
  it('exports no reversibility badge copy', () => {
    expect(exportedNames.filter((name) => name.includes('REVERSIBLE'))).toEqual([]);
  });

  it('exports nothing the Brief no longer renders', () => {
    expect(orphanedExports).toEqual([]);
  });
});
