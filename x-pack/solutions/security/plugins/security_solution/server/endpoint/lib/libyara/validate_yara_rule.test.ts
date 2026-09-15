/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import {
  getYaraEngineVersion,
  loadYaraValidateModule,
  setYaraLogger,
  validateYaraRule,
} from './validate_yara_rule';

/**
 * Smoke test against the real libyara WASM artifact.
 * Keep this focused — unit tests of the API validator should mock validateYaraRule.
 */
describe('validateYaraRule (libyara WASM)', () => {
  afterEach(() => {
    setYaraLogger(undefined);
  });

  it('reports the pinned engine version', async () => {
    await expect(getYaraEngineVersion()).resolves.toBe('4.3.2');
  });

  it('throws a clear error when validate_yara returns a null pointer', async () => {
    const mockLogger = loggingSystemMock.createLogger();
    setYaraLogger(mockLogger);

    const mod = await loadYaraValidateModule();
    const originalCcall = mod.ccall;
    const utf8ToString = jest.spyOn(mod, 'UTF8ToString');

    mod.ccall = ((
      ident: string,
      returnType: string | null,
      argTypes: string[],
      args: unknown[]
    ) => {
      if (ident === 'validate_yara') {
        return 0;
      }
      if (ident === 'validate_yara_free') {
        throw new Error('validate_yara_free should not be called for a null pointer');
      }
      return originalCcall(ident, returnType, argTypes, args);
    }) as typeof mod.ccall;

    try {
      await expect(validateYaraRule('rule X { condition: true }')).rejects.toThrow(
        'libyara WASM validate_yara returned null (allocation failed)'
      );
      expect(utf8ToString).not.toHaveBeenCalled();
      expect(
        mockLogger.error.mock.calls.some(
          (call) => typeof call[0] === 'string' && call[0].includes('WASM trap')
        )
      ).toBe(false);
      await expect(getYaraEngineVersion()).resolves.toBe('4.3.2');
    } finally {
      mod.ccall = originalCcall;
      utf8ToString.mockRestore();
    }
  });

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
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(result.warnings.length);
    expect(result.rules).toEqual([{ identifier: 'Minimal', meta: {}, duplicateMeta: [] }]);
  });

  it('returns syntax errors with line numbers', async () => {
    const result = await validateYaraRule(`
rule Broken {
  condition:
    not_a_thing
}
`);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errorCount).toBe(result.errors.length);
    expect(result.errors[0].message).toContain('undefined identifier');
    expect(result.errors[0].line).toBeGreaterThan(0);
    expect(result.rules).toEqual([]);
  });

  it('stores at most 64 errors and reports the full error count', async () => {
    const source = Array.from({ length: 103 }, (_, i) => `rule r${i}{condition:broken}`).join('\n');
    const result = await validateYaraRule(source);

    expect(result.errors).toHaveLength(64);
    expect(result.errorCount).toBe(103);
    expect(result.errors.every((e) => e.message.length > 0 && e.line > 0)).toBe(true);
    expect(new Set(result.errors.map((e) => e.line)).size).toBe(64);
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
    expect(result.rules).toEqual([]);
  });

  it('allows warnings without treating them as errors', async () => {
    const result = await validateYaraRule(`rule T { strings: $a = "x" condition: $a }`);

    expect(result.errors).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.rules).toEqual([{ identifier: 'T', meta: {}, duplicateMeta: [] }]);
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

  describe('logging', () => {
    it('logs debug metadata without rule source on validate', async () => {
      const mockLogger = loggingSystemMock.createLogger();
      setYaraLogger(mockLogger);

      const uniqueMarker = 'UNIQUE_YARA_LOG_MARKER_xyzzy';
      await validateYaraRule(`
rule Minimal {
  strings:
    $a = "${uniqueMarker}"
  condition:
    $a
}
`);

      expect(mockLogger.debug).toHaveBeenCalled();
      const debugArg = mockLogger.debug.mock.calls[0][0];
      const debugMessage = typeof debugArg === 'function' ? debugArg() : String(debugArg);

      expect(debugMessage).toContain('outcome=success');
      expect(debugMessage).toContain('errorCount=0');
      expect(debugMessage).toContain('ruleCount=1');
      expect(debugMessage).toContain('durationMs=');
      expect(debugMessage).toContain('sourceByteLength=');
      expect(debugMessage).not.toContain(uniqueMarker);
    });

    it('logs compile_error outcome without rule source', async () => {
      const mockLogger = loggingSystemMock.createLogger();
      setYaraLogger(mockLogger);

      const uniqueMarker = 'UNIQUE_YARA_LOG_MARKER_broken';
      await validateYaraRule(`
rule Broken {
  strings:
    $a = "${uniqueMarker}"
  condition:
    not_a_thing
}
`);

      expect(mockLogger.debug).toHaveBeenCalled();
      const debugArg = mockLogger.debug.mock.calls[0][0];
      const debugMessage = typeof debugArg === 'function' ? debugArg() : String(debugArg);

      expect(debugMessage).toContain('outcome=compile_error');
      expect(debugMessage).toContain('ruleCount=0');
      expect(debugMessage).not.toContain(uniqueMarker);
    });
  });

  describe('compiled rules', () => {
    it('returns no rules for comment-only source', async () => {
      const result = await validateYaraRule(`
        // just a comment
        /* also a comment */

        /*
          and even a multiline comment
          rule Rule1 { condition: true }
        */
      `);

      expect(result.errors).toEqual([]);
      expect(result.rules).toEqual([]);
    });

    it('extracts rule identifiers and filters metas to os, arch, and scan_type', async () => {
      const result = await validateYaraRule(`
rule Sample {
  meta:
    os = "Windows"
    arch = "x86"
    scan_type = "Memory"
    author = "alice"
  strings:
    $a = "hello"
  condition:
    $a
}
`);

      expect(result.errors).toEqual([]);
      expect(result.rules).toEqual([
        {
          identifier: 'Sample',
          meta: {
            os: 'Windows',
            arch: 'x86',
            scan_type: 'Memory',
          },
          duplicateMeta: [],
        },
      ]);
    });

    it('returns multiple compiled rules', async () => {
      const result = await validateYaraRule(`
rule First {
  condition: true
}
rule Second {
  meta:
    os = "Linux"
  condition: true
}
`);

      expect(result.errors).toEqual([]);
      expect(result.rules).toEqual([
        { identifier: 'First', meta: {}, duplicateMeta: [] },
        { identifier: 'Second', meta: { os: 'Linux' }, duplicateMeta: [] },
      ]);
    });

    it('stringifies integer and boolean metas and lists duplicate keys without values', async () => {
      const result = await validateYaraRule(`
rule Typed {
  meta:
    os = 1
    arch = true
    scan_type = "Memory"
    scan_type = "Disk"
  condition: true
}
`);

      expect(result.errors).toEqual([]);
      expect(result.rules).toEqual([
        {
          identifier: 'Typed',
          meta: {
            os: '1',
            arch: 'true',
          },
          duplicateMeta: ['scan_type'],
        },
      ]);
    });

    describe('max rules', () => {
      it('accepts 256 compiled rules', async () => {
        const source = Array.from({ length: 256 }, (_, i) => `rule r${i}{condition:true}`).join('');
        const result = await validateYaraRule(source);

        expect(result.errors).toEqual([]);
        expect(result.rules).toEqual(
          Array.from({ length: 256 }, (_, i) => ({
            identifier: `r${i}`,
            meta: {},
            duplicateMeta: [],
          }))
        );
      });

      it('rejects more than 256 compiled rules', async () => {
        const source = Array.from({ length: 257 }, (_, i) => `rule r${i}{condition:true}`).join('');
        const result = await validateYaraRule(source);

        expect(result.errors).toEqual([
          expect.objectContaining({
            severity: 'error',
            message: 'YARA source contains 257 rules; maximum is 256',
          }),
        ]);
        expect(result.rules).toEqual([]);
      });
    });
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
