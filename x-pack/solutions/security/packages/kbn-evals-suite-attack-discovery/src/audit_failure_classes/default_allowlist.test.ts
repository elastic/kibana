/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Fs from 'fs';
import Path from 'path';
import { DEFAULT_ALLOWLIST, DEFAULT_ALLOW_REPLACEMENT, ENRICHED_FIELDS } from './default_allowlist';

const PLUGIN_SOURCE = Path.resolve(
  __dirname,
  '../../../../plugins/elastic_assistant/common/anonymization/index.ts'
);

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/** The quoted entries of `export const <name> = [...]`, comments removed, sorted. */
const readPluginList = (name: string): string[] => {
  const source = stripComments(Fs.readFileSync(PLUGIN_SOURCE, 'utf-8'));
  const block = new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\];`).exec(source)?.[1] ?? '';
  return Array.from(block.matchAll(/'([^']+)'/g), ([, field]) => field).sort();
};

describe('stripComments', () => {
  it('removes line and block comments but keeps the quoted entries', () => {
    expect(stripComments("['a', // 'b'\n /* 'c' */ 'd']")).toBe("['a', \n  'd']");
  });
});

describe('DEFAULT_ALLOWLIST', () => {
  it('matches DEFAULT_ALLOW in the elastic_assistant plugin', () => {
    const pluginFields = readPluginList('DEFAULT_ALLOW');
    expect(pluginFields.length).toBeGreaterThan(0);
    expect([...DEFAULT_ALLOWLIST].sort()).toEqual(pluginFields);
  });

  it('matches DEFAULT_ALLOW_REPLACEMENT in the elastic_assistant plugin', () => {
    const pluginFields = readPluginList('DEFAULT_ALLOW_REPLACEMENT');
    expect(pluginFields.length).toBeGreaterThan(0);
    expect([...DEFAULT_ALLOW_REPLACEMENT].sort()).toEqual(pluginFields);
  });

  it('keeps the identity fields the enriched variant adds out of the allowlist, except cloud.provider', () => {
    const missing = ENRICHED_FIELDS.filter((field) => !DEFAULT_ALLOWLIST.includes(field));
    expect(missing).toEqual([
      'cloud.account.id',
      'user.id',
      'source.as.organization.name',
      'source.as.number',
      'user_agent.original',
    ]);
  });
});
