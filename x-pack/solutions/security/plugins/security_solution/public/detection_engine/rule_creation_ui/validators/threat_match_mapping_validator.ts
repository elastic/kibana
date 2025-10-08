/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  containsInvalidItems,
  singleEntryThreat,
} from '../../../common/components/threat_match/helpers';
import type { FormData, ValidationFunc } from '../../../shared_imports';
import type { ThreatMapping } from '../../../../common/api/detection_engine/model/rule_schema';

export function threatMatchMappingValidatorFactory(): ValidationFunc<
  FormData,
  string,
  ThreatMapping
> {
  return (...args) => {
    const [{ path, value }] = args;

    if (singleEntryThreat(value)) {
      return {
        code: 'ERR_FIELD_MISSING',
        path,
        message: i18n.translate(
          'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customThreatQueryFieldRequiredError',
          {
            defaultMessage: 'At least one indicator match is required.',
          }
        ),
      };
    }

    if (containsInvalidItems(value)) {
      return {
        code: 'ERR_FIELD_MISSING',
        path,
        message: i18n.translate(
          'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.customThreatQueryFieldRequiredEmptyError',
          {
            defaultMessage: 'All matches require both a field and threat index field.',
          }
        ),
      };
    }
  };
}
