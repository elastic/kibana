/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OsTypeArray } from '@kbn/securitysolution-io-ts-list-types';
import type { YaraCompiledRule, YaraMetaKeyOfInterest, YaraValidateResult } from '../libyara';
import { validateYaraRule } from '../libyara';
import { MAX_YARA_RULE_CONTENT_BYTE_LENGTH, MAXIMUM_RULE_IDENTIFIER_LENGTH } from './constants';

const VALID_META_ARCH_VALUES = Object.freeze(['x86', 'arm64']);
const VALID_META_SCAN_TYPE_VALUE = 'Memory';
const VALID_META_OS_VALUES = Object.freeze(['Windows', 'Linux', 'MacOS']);

const hasDuplicateValues = (values: string[]): boolean => new Set(values).size !== values.length;

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

  validateThatAtLeastOneYaraRuleExists(result);

  const textLines = ruleText.split('\n');

  for (const rule of result.rules) {
    validateRuleIdentifierLength(rule, textLines, result);
    validateMetaFieldsOfInterestForDuplication(rule, textLines, result);
    validateMetaArchField(rule, textLines, result);
    validateMetaScanTypeField(rule, textLines, result);
    validateMetaOsField(rule, textLines, result, osTypes);
  }

  return result;
};

const validateThatAtLeastOneYaraRuleExists = (result: YaraValidateResult) => {
  if (result.errorCount === 0 && result.rules.length === 0) {
    result.errors.push({
      message: 'No YARA rules found. Please provide at least one rule',
      line: 0,
      severity: 'error',
    });
    result.errorCount++;
  }
};

const getRuleIdentifierLineNumber = (textLines: string[], identifier: string) => {
  const lineIndex = textLines.findIndex((textLine) => textLine.match(`rule ${identifier}\\b`));

  // If not found, -1+1 results 0 which is the 'unknown' line in our error messages.
  // For other indexes, +1 results in the correct 1-based line number.
  const lineNumber = lineIndex + 1;

  return lineNumber;
};

const findFirstOccurrenceLineNumberAfterLineNumber = (
  textLines: string[],
  searchString: YaraMetaKeyOfInterest,
  startLineNumber: number
) => {
  const lineIndex = textLines.findIndex(
    (textLine, index) => index + 1 >= startLineNumber && textLine.match(`\\b${searchString}\\b`)
  );

  return lineIndex + 1;
};

const validateRuleIdentifierLength = (
  rule: YaraCompiledRule,
  textLines: string[],
  result: YaraValidateResult
) => {
  if (rule.identifier.length > MAXIMUM_RULE_IDENTIFIER_LENGTH) {
    const lineNumber = getRuleIdentifierLineNumber(textLines, rule.identifier);

    result.errorCount++;
    result.errors.push({
      message: `Too long rule identifier "${rule.identifier}", maximum is ${MAXIMUM_RULE_IDENTIFIER_LENGTH} characters`,
      line: lineNumber,
      severity: 'error',
    });
  }
};

const validateMetaFieldsOfInterestForDuplication = (
  rule: YaraCompiledRule,
  textLines: string[],
  result: YaraValidateResult
) => {
  for (const duplicatedMeta of rule.duplicateMeta) {
    const lineNumberOfRule = getRuleIdentifierLineNumber(textLines, rule.identifier);
    const lineNumber = findFirstOccurrenceLineNumberAfterLineNumber(
      textLines,
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
};

const validateMetaArchField = (
  rule: YaraCompiledRule,
  textLines: string[],
  result: YaraValidateResult
) => {
  if (rule.meta.arch !== undefined) {
    const values = rule.meta.arch.split(/, ?/);

    if (
      values.length > 2 ||
      hasDuplicateValues(values) ||
      values.some((value) => !VALID_META_ARCH_VALUES.includes(value))
    ) {
      const lineNumberOfRule = getRuleIdentifierLineNumber(textLines, rule.identifier);
      const lineNumber = findFirstOccurrenceLineNumberAfterLineNumber(
        textLines,
        'arch',
        lineNumberOfRule
      );

      result.errorCount++;
      result.errors.push({
        message: `Invalid "meta.arch" value "${shortenMetaValue(rule.meta.arch)}" on rule "${
          rule.identifier
        }", only "x86" and\/or "arm64" are allowed in a comma separated list`,
        line: lineNumber,
        severity: 'error',
      });
    }
  }
};

const validateMetaScanTypeField = (
  rule: YaraCompiledRule,
  textLines: string[],
  result: YaraValidateResult
) => {
  if (rule.meta.scan_type !== undefined && rule.meta.scan_type !== VALID_META_SCAN_TYPE_VALUE) {
    const lineNumberOfRule = getRuleIdentifierLineNumber(textLines, rule.identifier);
    const lineNumber = findFirstOccurrenceLineNumberAfterLineNumber(
      textLines,
      'scan_type',
      lineNumberOfRule
    );

    result.errorCount++;
    result.errors.push({
      message: `Invalid "meta.scan_type" value "${shortenMetaValue(
        rule.meta.scan_type
      )}" on rule "${rule.identifier}", only "Memory" is allowed`,
      line: lineNumber,
      severity: 'error',
    });
  }
};

const validateMetaOsField = (
  rule: YaraCompiledRule,
  textLines: string[],
  result: YaraValidateResult,
  osTypes: ('linux' | 'macos' | 'windows')[]
) => {
  if (rule.meta.os !== undefined) {
    const values = rule.meta.os.split(/, ?/);

    // Validate values
    if (
      values.length > 3 ||
      hasDuplicateValues(values) ||
      values.some((value) => !VALID_META_OS_VALUES.includes(value))
    ) {
      const lineNumberOfRule = getRuleIdentifierLineNumber(textLines, rule.identifier);
      const lineNumber = findFirstOccurrenceLineNumberAfterLineNumber(
        textLines,
        'os',
        lineNumberOfRule
      );

      result.errorCount++;
      result.errors.push({
        message: `Invalid "meta.os" value "${shortenMetaValue(rule.meta.os)}" on rule "${
          rule.identifier
        }", only "Windows", "Linux" and\/or "MacOS" are allowed in a comma separated list`,
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
        const lineNumberOfRule = getRuleIdentifierLineNumber(textLines, rule.identifier);
        const lineNumber = findFirstOccurrenceLineNumberAfterLineNumber(
          textLines,
          'os',
          lineNumberOfRule
        );

        result.errorCount++;
        result.errors.push({
          message: `"meta.os" value "${
            rule.meta.os
          }" is different from "os_types" value "${osTypes.join(', ')}" on rule "${
            rule.identifier
          }". Set meta.os to the same OSes (using "Windows", "Linux" and\/or "MacOS") or drop the meta.os field`,
          line: lineNumber,
          severity: 'error',
        });
      }
    }
  }
};

// Should be smaller than or equal to `MAX_META_VALUE_LEN - 2` from `validate_yara.c`
// (-1 for the trailing zero byte in the buffer, so the max string length is actually `MAX_META_VALUE_LEN - 1`.
// Another -1 for making sure we don't display `...` when the string is at its maximum
// length and we don't know if it was truncated or not)
const MAXIMUM_META_VALUE_LENGTH = 30;

const shortenMetaValue = (value: string): string =>
  value.length > MAXIMUM_META_VALUE_LENGTH
    ? `${value.slice(0, MAXIMUM_META_VALUE_LENGTH)}...`
    : value;
