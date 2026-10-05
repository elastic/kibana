/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

const packageDirectory = (packageName: string): string =>
  dirname(require.resolve(`${packageName}/package.json`));

const PROMPT_DIRECTORIES = [
  __dirname,
  join(packageDirectory('@kbn/nightshift-investigations-plugin'), 'server/agents'),
  join(packageDirectory('@kbn/nightshift-ai'), 'src/significant_events'),
];

const LEGACY_FIELD = /\bstream_names?\b/;

const findPromptFiles = (directory: string): string[] =>
  readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.text'))
    .map((file) => join(directory, file));

describe('agent prompt and skill text', () => {
  it('finds prompt files to check', () => {
    expect(PROMPT_DIRECTORIES.flatMap(findPromptFiles).length).toBeGreaterThan(0);
  });

  it('does not use the legacy stream_name(s) field names', () => {
    const offenders = PROMPT_DIRECTORIES.flatMap(findPromptFiles).filter((file) =>
      LEGACY_FIELD.test(readFileSync(file, 'utf8'))
    );

    expect(offenders).toEqual([]);
  });
});
