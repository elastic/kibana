/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '@kbn/lists-plugin/server';
import type { ExceptionListItemSchema, OsTypeArray } from '@kbn/securitysolution-io-ts-list-types';
import type { PromiseFromStreams } from '@kbn/lists-plugin/server/services/exception_lists/import_exception_list_and_items';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import type { YaraValidateResult } from '../../../endpoint/lib/libyara';
import { getYaraEngineVersion, validateYaraRule } from '../../../endpoint/lib/libyara';
import { CUSTOM_YARA_SIGNATURE_FIELD_TYPE } from '../../../../common/endpoint/service/artifacts/constants';
import { BaseValidator } from './base_validator';
import { EndpointArtifactExceptionValidationError } from './errors';
import type { ExceptionItemLikeOptions } from '../types';

/**
 * Maximum YARA rule text size stored in the value field.
 * Upper-bounded by Elasticsearch `keyword` (32766 UTF-8 bytes). Reused as
 * `schema.string()` `maxLength` for greppable input bounds: JS string length is
 * always ≤ UTF-8 byte length, so ASCII can still use the full 32766 bytes.
 * Multi-byte content is constrained by `validateYaraRuleContentByteLength`.
 */
export const MAX_YARA_RULE_CONTENT_BYTE_LENGTH = 32766;

/**
 * Maximum length of a YARA rule identifier. Kept at 95 characters, because in ManifestManager
 * we're adding 1 underscore plus 32 unique characters to the identifier to make it unique,
 * which is 128 characters in total, which equals to the limit by the YARA engine.
 */
export const MAXIMUM_RULE_IDENTIFIER_LENGTH = 95;

const VALID_META_ARCH_VALUES = ['x86', 'arm64'];
const VALID_META_SCAN_TYPE_VALUE = 'Memory';
const VALID_META_OS_VALUES = ['Windows', 'Linux', 'MacOS'];

const validateYaraRuleContentByteLength = (value: string): string | void => {
  const byteLength = Buffer.byteLength(value, 'utf8');

  if (byteLength > MAX_YARA_RULE_CONTENT_BYTE_LENGTH) {
    return `YARA rule content must not exceed ${MAX_YARA_RULE_CONTENT_BYTE_LENGTH} bytes (got ${byteLength} bytes)`;
  }
};

const YaraEntrySchema = schema.object({
  field: schema.literal(CUSTOM_YARA_SIGNATURE_FIELD_TYPE),
  operator: schema.literal('included'),
  type: schema.literal('match'),
  value: schema.string({
    minLength: 1,
    // maxLength is only set for auditing purposes, the actual validation is done by validateYaraRuleContentByteLength.
    // We set it to Infinity in order to not mix error messages between the two validatiors: this way we always show the
    // correct error message mentioning `bytes` instead of `characters` coming from validateYaraRuleContentByteLength.
    maxLength: Number.POSITIVE_INFINITY,
    validate: validateYaraRuleContentByteLength,
  }),
});

const YaraSignatureDataSchema = schema.object(
  {
    name: schema.string({ minLength: 1, maxLength: 256 }),

    description: schema.string({ minLength: 0, maxLength: 256, defaultValue: '' }),

    namespaceType: schema.literal('agnostic'),

    osTypes: schema.arrayOf(
      schema.oneOf([
        schema.literal(OperatingSystem.WINDOWS),
        schema.literal(OperatingSystem.LINUX),
        schema.literal(OperatingSystem.MAC),
      ]),
      { minSize: 1, maxSize: 3 }
    ),

    entries: schema.arrayOf(YaraEntrySchema, { minSize: 1, maxSize: 1 }),
  },
  {
    unknowns: 'ignore',
  }
);

export class CustomYaraSignaturesValidator extends BaseValidator {
  static isCustomYaraSignature(item: { listId: string }): boolean {
    return item.listId === ENDPOINT_ARTIFACT_LISTS.customYaraSignatures.id;
  }

  private async validateCustomYaraSignaturesFeatureEnabled(): Promise<void> {
    if (!this.endpointAppContext.experimentalFeatures.customYaraSignaturesEnabled) {
      throw new EndpointArtifactExceptionValidationError(
        'Custom YARA signatures feature is not released yet'
      );
    }
  }

  protected async validateHasWritePrivilege(): Promise<void> {
    return this.validateHasPrivilege('canWriteCustomYaraSignatures');
  }

  protected async validateHasReadPrivilege(): Promise<void> {
    return this.validateHasPrivilege('canReadCustomYaraSignatures');
  }

  async validatePreImport(items: PromiseFromStreams): Promise<void> {
    await this.validateCustomYaraSignaturesFeatureEnabled();

    await this.validateHasWritePrivilege();

    await this.validatePreImportItems(items, async (item) => {
      // import specific validations
      await this.validateImportOwnerSpaceIds(item); // instead of validateCreateOwnerSpaceIds
      await this.validateCanImportGlobalArtifacts(item); // instead of validateCanCreateGlobalArtifacts
      await this.removeInvalidPolicyIds(item); // instead of validateByPolicyItem

      // usual validators from pre-create
      await this.validateCustomYaraSignatureData(item);
      await this.validateCanCreateByPolicyArtifacts(item);
    });
  }

  async validatePreCreateItem(
    item: CreateExceptionListItemOptions
  ): Promise<CreateExceptionListItemOptions> {
    await this.validateCustomYaraSignaturesFeatureEnabled();

    await this.validateHasWritePrivilege();
    await this.validateCustomYaraSignatureData(item);
    await this.validateCanCreateByPolicyArtifacts(item);
    await this.validateByPolicyItem(item);
    await this.validateCanCreateGlobalArtifacts(item);
    await this.validateCreateOwnerSpaceIds(item);

    return item;
  }

  async validatePreUpdateItem(
    _updatedItem: UpdateExceptionListItemOptions,
    currentItem: ExceptionListItemSchema
  ): Promise<UpdateExceptionListItemOptions> {
    await this.validateCustomYaraSignaturesFeatureEnabled();

    const updatedItem = _updatedItem as ExceptionItemLikeOptions;

    await this.validateHasWritePrivilege();
    await this.validateCustomYaraSignatureData(updatedItem);

    try {
      await this.validateCanCreateByPolicyArtifacts(updatedItem);
    } catch (noByPolicyAuthzError) {
      // Not allowed to create/update by policy data. Validate that the effective scope of the item
      // remained unchanged with this update or was set to `global` (only allowed update). If not,
      // then throw the validation error that was catch'ed
      if (this.wasByPolicyEffectScopeChanged(updatedItem, currentItem)) {
        throw noByPolicyAuthzError;
      }
    }

    await this.validateByPolicyItem(updatedItem, currentItem);
    await this.validateUpdateOwnerSpaceIds(_updatedItem, currentItem);
    await this.validateCanUpdateItemInActiveSpace(_updatedItem, currentItem);

    return _updatedItem;
  }

  async validatePreDeleteItem(currentItem: ExceptionListItemSchema): Promise<void> {
    await this.validateCustomYaraSignaturesFeatureEnabled();

    await this.validateHasWritePrivilege();
    await this.validateCanDeleteItemInActiveSpace(currentItem);
  }

  async validatePreGetOneItem(currentItem: ExceptionListItemSchema): Promise<void> {
    await this.validateCustomYaraSignaturesFeatureEnabled();

    await this.validateHasReadPrivilege();
    await this.validateCanReadItemInActiveSpace(currentItem);
  }

  async validatePreMultiListFind(): Promise<void> {
    await this.validateCustomYaraSignaturesFeatureEnabled();

    await this.validateHasReadPrivilege();
  }

  async validatePreExport(): Promise<void> {
    await this.validateCustomYaraSignaturesFeatureEnabled();

    await this.validateHasReadPrivilege();
  }

  async validatePreSingleListFind(): Promise<void> {
    await this.validateCustomYaraSignaturesFeatureEnabled();

    await this.validateHasReadPrivilege();
  }

  async validatePreGetListSummary(): Promise<void> {
    await this.validateCustomYaraSignaturesFeatureEnabled();

    await this.validateHasReadPrivilege();
  }

  private async validateCustomYaraSignatureData(item: ExceptionItemLikeOptions): Promise<void> {
    try {
      YaraSignatureDataSchema.validate(item);
    } catch (error) {
      throw new EndpointArtifactExceptionValidationError(error.message);
    }

    const entry = item.entries[0];
    const ruleText =
      entry && 'value' in entry && typeof entry.value === 'string' ? entry.value : undefined;

    if (ruleText === undefined) {
      throw new EndpointArtifactExceptionValidationError('YARA rule content is missing');
    }

    let errors;
    let errorCount;
    try {
      // Only errors are rejected on create/update.
      ({ errors, errorCount } = await this.validateCustomYaraRule(ruleText, item.osTypes));
    } catch (error) {
      this.logger.error(error);
      throw new EndpointArtifactExceptionValidationError(
        'Unable to validate YARA rule due to an internal error. Please try again later.',
        500
      );
    }

    if (errors.length > 0) {
      let libyaraVersion = 'unknown';
      try {
        libyaraVersion = await getYaraEngineVersion();
      } catch (error) {
        this.logger.error(error);
      }

      const details = errors
        .map((e) => (e.line > 0 ? `[line ${e.line}] ${e.message}` : e.message))
        .join('; ');
      throw new EndpointArtifactExceptionValidationError(
        `Invalid YARA rules (libyara ${libyaraVersion}), ${errorCount} error${
          errorCount > 1 ? 's' : ''
        } found: ${details}`
      );
    }
  }

  /**
   * Validates a YARA rule in regards of YARA syntax and Custom YARA Signatures specific requirements.
   */
  private async validateCustomYaraRule(
    ruleText: string,
    osTypes: OsTypeArray
  ): Promise<YaraValidateResult> {
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
  }
}
