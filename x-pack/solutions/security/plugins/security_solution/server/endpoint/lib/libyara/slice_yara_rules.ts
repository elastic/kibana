/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { YaraValidateResult } from './types';

/**
 * Splits compiled-valid YARA source into one standalone rule string per compiled rule.
 * File-level imports are prepended to every slice so each can compile on its own.
 */
export const sliceYaraRulesFromSource = (source: string, result: YaraValidateResult): string[] => {
  if (result.errorCount > 0) {
    throw new Error('Cannot flatten YARA source that failed to compile');
  }

  const bytes = Buffer.from(source, 'utf8');
  const preamble = result.imports.map((name) => `import "${name}"`).join('\n');

  return result.rules.map((rule) => {
    if (
      rule.sourceStart < 0 ||
      rule.sourceEnd < 0 ||
      rule.sourceEnd < rule.sourceStart ||
      rule.sourceEnd > bytes.length
    ) {
      throw new Error(`Missing source span for YARA rule "${rule.identifier}"`);
    }

    const body = bytes.subarray(rule.sourceStart, rule.sourceEnd).toString('utf8').trim();
    if (body.length === 0) {
      throw new Error(`Missing source span for YARA rule "${rule.identifier}"`);
    }

    return preamble.length > 0 ? `${preamble}\n\n${body}` : body;
  });
};
