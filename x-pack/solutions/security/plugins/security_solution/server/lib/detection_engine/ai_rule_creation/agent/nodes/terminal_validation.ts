/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { EsqlRuleCreateProps } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { RuleCreationState, RejectionCode } from '../state';

export const terminalValidationNode = () => async (state: RuleCreationState) => {
  const result = EsqlRuleCreateProps.safeParse(state.rule);
  if (result.success) {
    return {};
  }

  const details = stringifyZodError(result.error);

  return {
    rejectionReason: {
      code: 'INVALID_OUTPUT' as RejectionCode,
      message: 'The assembled rule failed schema validation',
      details,
    },
  };
};
