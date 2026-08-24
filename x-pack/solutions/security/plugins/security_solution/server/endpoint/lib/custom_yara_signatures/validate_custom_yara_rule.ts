/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OsTypeArray } from '@kbn/securitysolution-io-ts-list-types';
import type { YaraValidateResult } from '../libyara';
import { validateYaraRule } from '../libyara';
import { MAX_YARA_RULE_CONTENT_BYTE_LENGTH, MAXIMUM_RULE_IDENTIFIER_LENGTH } from './constants';

const VALID_META_ARCH_VALUES = ['x86', 'arm64'];
const VALID_META_SCAN_TYPE_VALUE = 'Memory';
const VALID_META_OS_VALUES = ['Windows', 'Linux', 'MacOS'];

export const validateYaraRuleContentByteLength = (value: string): string | void => {
  const byteLength = Buffer.byteLength(value, 'utf8');

  if (byteLength > MAX_YARA_RULE_CONTENT_BYTE_LENGTH) {
    return `YARA rule content must not exceed ${MAX_YARA_RULE_CONTENT_BYTE_LENGTH} bytes (got ${byteLength} bytes)`;
  }
};

/**
 * Validates YARA syntax and Custom YARA Signatures product constraints for a rule text and OS list.
 */
export const validateCustomYaraRule = async (
  ruleText: string,
  osTypes: OsTypeArray
): Promise<YaraValidateResult> => {
  const byteLengthError = validateYaraRuleContentByteLength(ruleText);
  if (byteLengthError) {
    return {
      errors: [{ message: byteLengthError, line: 0, severity: 'error' }],
      warnings: [],
      errorCount: 1,
      warningCount: 0,
      rules: [],
    };
  }

  const result = await validateYaraRule(ruleText);

  // Validate that we have at least one rule
  if (result.errorCount === 0 && result.rules.length === 0) {
    result.errors.push({
      message: 'No YARA rules found. Please provide at least one rule',
      line: 0,
      severity: 'error',
    });
    result.errorCount++;
  }

  const textLines = ruleText.split('\n');
  const getRuleIdentifierLineNumber = (identifier: string) => {
    const lineIndex = textLines.findIndex((textLine) => textLine.match(`rule ${identifier}\\b`));

    // If not found, -1+1 results 0 which is the 'unknown' line in our error messages.
    // For other indexes, +1 results in the correct 1-based line number.
    const lineNumber = lineIndex + 1;

    return lineNumber;
  };

  const findFirstOccurrenceLineNumberAfterLineNumber = (
    searchString: string,
    startLineNumber: number
  ) => {
    const lineIndex = textLines.findIndex(
      (textLine, index) => index + 1 >= startLineNumber && textLine.match(`\\b${searchString}\\b`)
    );

    return lineIndex + 1;
  };

  // Validate that we don't have any rule identifiers that are too long
  if (result.rules.length > 0) {
    const tooLongIdentifiers = result.rules
      .map(({ identifier }) => identifier)
      .filter((identifier) => identifier.length > MAXIMUM_RULE_IDENTIFIER_LENGTH);

    if (tooLongIdentifiers.length > 0) {
      for (const identifier of tooLongIdentifiers) {
        const lineNumber = getRuleIdentifierLineNumber(identifier);

        result.errorCount++;
        result.errors.push({
          message: `Too long rule identifier "${identifier}", maximum is ${MAXIMUM_RULE_IDENTIFIER_LENGTH} characters`,
          line: lineNumber,
          severity: 'error',
        });
      }
    }
  }

  // Validate that we don't have any duplicated meta fields of interest
  for (const rule of result.rules) {
    for (const duplicatedMeta of rule.duplicateMeta) {
      const lineNumberOfRule = getRuleIdentifierLineNumber(rule.identifier);
      const lineNumber = findFirstOccurrenceLineNumberAfterLineNumber(
        duplicatedMeta,
        lineNumberOfRule
      );

      result.errorCount++;
      result.errors.push({
        message: `Multiple "meta.${duplicatedMeta}" fields set on rule "${rule.identifier}", only one is allowed`,
        line: lineNumber,
        severity: 'error',
      });
    }
  }

  // Validate meta.arch field
  for (const rule of result.rules) {
    if (rule.meta.arch !== undefined) {
      const values = rule.meta.arch.split(',').map((value) => value.trim());

      if (values.length > 2 || values.some((value) => !VALID_META_ARCH_VALUES.includes(value))) {
        const lineNumberOfRule = getRuleIdentifierLineNumber(rule.identifier);
        const lineNumber = findFirstOccurrenceLineNumberAfterLineNumber('arch', lineNumberOfRule);

        result.errorCount++;
        result.errors.push({
          message: `Invalid "meta.arch" value "${rule.meta.arch}" on rule "${rule.identifier}", only "x86" and\/or "arm64" are allowed in a comma separated list`,
          line: lineNumber,
          severity: 'error',
        });
      }
    }
  }

  // Validate meta.scan_type field
  for (const rule of result.rules) {
    if (rule.meta.scan_type !== undefined && rule.meta.scan_type !== VALID_META_SCAN_TYPE_VALUE) {
      const lineNumberOfRule = getRuleIdentifierLineNumber(rule.identifier);
      const lineNumber = findFirstOccurrenceLineNumberAfterLineNumber(
        'scan_type',
        lineNumberOfRule
      );

      result.errorCount++;
      result.errors.push({
        message: `Invalid "meta.scan_type" value "${rule.meta.scan_type}" on rule "${rule.identifier}", only "Memory" is allowed`,
        line: lineNumber,
        severity: 'error',
      });
    }
  }

  // Validate meta.os field
  for (const rule of result.rules) {
    if (rule.meta.os !== undefined) {
      const values = rule.meta.os.split(',').map((value) => value.trim());

      // Validate values
      if (values.length > 3 || values.some((value) => !VALID_META_OS_VALUES.includes(value))) {
        const lineNumberOfRule = getRuleIdentifierLineNumber(rule.identifier);
        const lineNumber = findFirstOccurrenceLineNumberAfterLineNumber('os', lineNumberOfRule);

        result.errorCount++;
        result.errors.push({
          message: `Invalid "meta.os" value "${rule.meta.os}" on rule "${rule.identifier}", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list`,
          line: lineNumber,
          severity: 'error',
        });
      } else {
        // Validate that the values are the same as the os_types
        values.sort();
        const osValuesFromYaraRule = values.join('-').toLowerCase();

        const osTypesSorted = [...osTypes].sort();
        const osValuesFromOsTypes = osTypesSorted.join('-');

        if (osValuesFromYaraRule !== osValuesFromOsTypes) {
          const lineNumberOfRule = getRuleIdentifierLineNumber(rule.identifier);
          const lineNumber = findFirstOccurrenceLineNumberAfterLineNumber('os', lineNumberOfRule);

          result.errorCount++;
          result.errors.push({
            message: `"meta.os" value "${
              rule.meta.os
            }" is different from "os_types" value "${osTypes.join(', ')}" on rule "${
              rule.identifier
            }", Set meta.os to the same OSes (using "Windows", "Linux" and\/or "MacOS") or drop the meta.os field`,
            line: lineNumber,
            severity: 'error',
          });
        }
      }
    }
  }

  return result;
};
