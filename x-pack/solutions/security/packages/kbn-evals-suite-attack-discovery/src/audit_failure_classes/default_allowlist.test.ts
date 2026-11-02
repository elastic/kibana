/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Fs from 'fs';
import Path from 'path';
import { DEFAULT_ALLOWLIST, ENRICHED_FIELDS } from './default_allowlist';

const PLUGIN_SOURCE = Path.resolve(
  __dirname,
  '../../../../plugins/elastic_assistant/common/anonymization/index.ts'
);

describe('DEFAULT_ALLOWLIST', () => {
  it('matches DEFAULT_ALLOW in the elastic_assistant plugin', () => {
    const source = Fs.readFileSync(PLUGIN_SOURCE, 'utf-8');
    const block = /export const DEFAULT_ALLOW = \[([\s\S]*?)\];/.exec(source)?.[1] ?? '';
    const pluginFields = Array.from(block.matchAll(/'([^']+)'/g)).map(([, field]) => field);

    expect(pluginFields.length).toBeGreaterThan(0);
    expect([...DEFAULT_ALLOWLIST]).toEqual(pluginFields);
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
