/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { resolveRulesetForInstall } from './ruleset';

describe('resolveRulesetForInstall', () => {
  const createdFiles: string[] = [];
  const createRulesetFile = (yaml: string): string => {
    const tmpRoot = path.join(
      process.cwd(),
      'target',
      'security_solution_data_generator_ruleset_tests'
    );
    fs.mkdirSync(tmpRoot, { recursive: true });
    const rulesetPath = path.join(
      tmpRoot,
      `ruleset-${Date.now()}-${Math.random().toString(16).slice(2)}.yml`
    );
    fs.writeFileSync(rulesetPath, yaml, 'utf8');
    createdFiles.push(rulesetPath);
    return rulesetPath;
  };

  afterEach(() => {
    for (const file of createdFiles) {
      fs.rmSync(file, { force: true });
    }
    createdFiles.length = 0;
  });

  const log = new ToolingLog({
    level: 'silent',
    writeTo: {
      write: () => {},
    },
  });

  it('resolves a rule when any token matches', () => {
    const rulesetPath = createRulesetFile(
      [
        'rules:',
        '  - id: matches_any',
        '    match:',
        '      name_contains_any:',
        '        - foo',
        '        - does-not-match',
        '',
      ].join('\n')
    );

    const resolved = resolveRulesetForInstall({
      log,
      rulesetPath,
      installableRules: [
        { rule_id: 'r1', name: 'Foo Rule', version: 1 },
        { rule_id: 'r2', name: 'Totally Different', version: 1 },
      ],
    });

    expect(resolved).toEqual([{ rule_id: 'r1', name: 'Foo Rule', version: 1 }]);
  });

  it('returns no rules when no token matches in non-strict mode', () => {
    const rulesetPath = createRulesetFile(
      [
        'rules:',
        '  - id: matches_none',
        '    match:',
        '      name_contains_any:',
        '        - does-not-match',
        '',
      ].join('\n')
    );

    const resolved = resolveRulesetForInstall({
      log,
      rulesetPath,
      installableRules: [{ rule_id: 'r1', name: 'Foo Rule', version: 1 }],
      strict: false,
    });

    expect(resolved).toEqual([]);
  });
});
