/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataViewBase } from '@kbn/es-query';
import {
  containsInvalidItems,
  singleEntryThreat,
} from '../../../../../common/components/threat_match/helpers';
import type { FormData, ValidationFunc } from '../../../../../shared_imports';
import type { ThreatMapping } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { THREAT_MATCH_MAPPING_ERROR_CODES } from './error_codes';
import { getUnknownThreatMatchMappingFieldNames } from './get_unknown_threat_match_mapping_field_names';
import {
  containsDoesNotMatchEntriesOnly,
  containsInvalidDoesNotMatchEntries,
} from '../../../../../../common/utils/request_validation/indicator_match';

interface ThreatMatchMappingValidatorFactoryParams {
  indexPatterns: DataViewBase;
  threatIndexPatterns: DataViewBase;
}

export function threatMatchMappingValidatorFactory({
  indexPatterns,
  threatIndexPatterns,
}: ThreatMatchMappingValidatorFactoryParams): ValidationFunc<FormData, string, ThreatMapping> {
  return (...args) => {
    const [{ path, value }] = args;

    if (singleEntryThreat(value)) {
      return {
        code: THREAT_MATCH_MAPPING_ERROR_CODES.ERR_FIELD_MISSING,
        path,
        message: i18n.translate(
          'xpack.securitySolution.detectionEngine.ruleManagement.createRule.threatMappingField.requiredError',
          {
            defaultMessage: 'At least one indicator match is required.',
          }
        ),
      };
    }

    if (containsInvalidItems(value)) {
      return {
        code: THREAT_MATCH_MAPPING_ERROR_CODES.ERR_FIELD_MISSING,
        path,
        message: i18n.translate(
          'xpack.securitySolution.detectionEngine.ruleManagement.threatMappingField.bothFieldNamesRequiredError',
          {
            defaultMessage: 'All matches require both a field and threat index field.',
          }
        ),
      };
    }

    const { unknownSourceIndicesFields, unknownThreatMatchIndicesFields } =
      getUnknownThreatMatchMappingFieldNames({
        entries: value,
        indexPatterns,
        threatIndexPatterns,
      });

    if (unknownSourceIndicesFields.length > 0 && unknownThreatMatchIndicesFields.length > 0) {
      return {
        code: THREAT_MATCH_MAPPING_ERROR_CODES.ERR_FIELDS_UNKNOWN,
        path,
        message: i18n.translate(
          'xpack.securitySolution.detectionEngine.ruleManagement.threatMappingField.unknownFields',
          {
            defaultMessage:
              'Indicator mapping has unknown fields. {unknownSourceIndicesFields} fields not found in the source events indices and {unknownThreatMatchIndicesFields} fields not found in the indicator indices.',
            values: {
              unknownSourceIndicesFields: `"${unknownSourceIndicesFields.join('", "')}"`,
              unknownThreatMatchIndicesFields: `"${unknownThreatMatchIndicesFields.join('", "')}"`,
            },
          }
        ),
      };
    }

    if (unknownSourceIndicesFields.length > 0) {
      return {
        code: THREAT_MATCH_MAPPING_ERROR_CODES.ERR_FIELDS_UNKNOWN,
        path,
        message: i18n.translate(
          'xpack.securitySolution.detectionEngine.ruleManagement.threatMappingField.unknownSourceIndicesFields',
          {
            defaultMessage:
              'Indicator mapping has unknown fields. {unknownSourceIndicesFields} fields not found in the source events indices.',
            values: {
              unknownSourceIndicesFields: `"${unknownSourceIndicesFields.join('", "')}"`,
            },
          }
        ),
      };
    }

    if (unknownThreatMatchIndicesFields.length > 0) {
      return {
        code: THREAT_MATCH_MAPPING_ERROR_CODES.ERR_FIELDS_UNKNOWN,
        path,
        message: i18n.translate(
          'xpack.securitySolution.detectionEngine.ruleManagement.threatMappingField.unknownIndicatorIndicesFields',
          {
            defaultMessage:
              'Indicator mapping has unknown fields. {unknownThreatMatchIndicesFields} fields not found in the indicator indices.',
            values: {
              unknownThreatMatchIndicesFields: `"${unknownThreatMatchIndicesFields.join('", "')}"`,
            },
          }
        ),
      };
    }

    if (containsDoesNotMatchEntriesOnly(value)) {
      return {
        code: THREAT_MATCH_MAPPING_ERROR_CODES.ERR_SINGLE_NOT_MATCH_CLAUSE,
        path,
        message: i18n.translate(
          'xpack.securitySolution.detectionEngine.ruleManagement.threatMappingField.singleNotMatchClauseError',
          {
            defaultMessage: 'Entries with AND clauses must have at least one MATCHES condition.',
          }
        ),
      };
    }

    if (containsInvalidDoesNotMatchEntries(value)) {
      return {
        code: THREAT_MATCH_MAPPING_ERROR_CODES.ERR_INVALID_NOT_MATCH_CLAUSE,
        path,
        message: i18n.translate(
          'xpack.securitySolution.detectionEngine.ruleManagement.threatMappingField.invalidNotMatchClauseError',
          {
            defaultMessage:
              'DOES NOT MATCH and MATCHES entries that are connected by an AND clause cannot use the same threat mappings. Choose a different threat mapping for one of the entries.',
          }
        ),
      };
    }
  };
}
