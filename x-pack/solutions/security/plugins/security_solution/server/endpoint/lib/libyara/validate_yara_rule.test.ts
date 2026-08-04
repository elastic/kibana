/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateYaraRule } from './validate_yara_rule';

/**
 * Smoke test against the real libyara WASM artifact.
 * Keep this focused — unit tests of the API validator should mock validateYaraRule.
 */
describe('validateYaraRule (libyara WASM)', () => {
  it('accepts a minimal valid rule', async () => {
    const result = await validateYaraRule(`
rule Minimal {
  strings:
    $a = "hello"
  condition:
    $a
}
`);

    expect(result.errors).toEqual([]);
  });

  it('returns syntax errors with line numbers', async () => {
    const result = await validateYaraRule(`
rule Broken {
  condition:
    not_a_thing
}
`);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('undefined identifier');
    expect(result.errors[0].line).toBeGreaterThan(0);
  });

  it('rejects #include (includes disabled)', async () => {
    const result = await validateYaraRule(`
include "other.yar"
rule X {
  condition:
    true
}
`);

    expect(result.errors.some((e) => /include/i.test(e.message))).toBe(true);
  });

  it('allows warnings without treating them as errors', async () => {
    const result = await validateYaraRule(`rule T { strings: $a = "x" condition: $a }`);

    expect(result.errors).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('reports pe field errors without poisoning later validations', async () => {
    const bad = await validateYaraRule(`
      import "pe"
      rule BadPe {
        condition:
        pe.not_a_real_field
        }
        `);
    expect(bad.errors.length).toBeGreaterThan(0);
    expect(bad.errors[0].message).toMatch(/invalid field name/i);

    const good = await validateYaraRule(`
          rule Minimal {
            strings:
            $a = "hello"
            condition:
            $a
            }
            `);
    expect(good.errors).toEqual([]);
  });

  describe('supported modules', () => {
    const supportedModules = ['pe', 'elf', 'math', 'time', 'string', 'console', 'tests'] as const;
    const moduleSmoke: Record<(typeof supportedModules)[number], string> = {
      pe: 'pe.is_pe',
      elf: 'elf.type == elf.ET_NONE',
      math: 'math.abs(-1) == 1',
      time: 'time.now() >= 0',
      string: 'string.length("a") == 1',
      console: 'console.log("x")',
      tests: 'tests.foobar(1) == "foo"',
    };

    it.each(supportedModules)('accepts rules that import the %s module', async (module) => {
      const result = await validateYaraRule(`
        import "${module}"
        rule ${module}Check {
          condition:
            ${moduleSmoke[module]}
          }
          `);

      expect(result.errors).toEqual([]);
    });
  });

  describe('unsupported modules', () => {
    const unsupportedModules = [
      // built-in but not supported YARA modules
      'hash',
      'macho',
      'dotnet',
      'dex',
      'magic',
      'cuckoo',

      // user modules
      'userModuleWithRandomName',
    ];

    it.each(unsupportedModules)('rejects rules that import the %s module', async (module) => {
      const result = await validateYaraRule(`
import "${module}"
rule ${module}Check {
  condition:
    true
}
`);

      expect(result.errors).toEqual([
        expect.objectContaining({
          severity: 'error',
          message: `unknown module "${module}"`,
        }),
      ]);
    });
  });
});
