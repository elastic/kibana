/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import { getQueryRuleParams } from '../../../../rule_schema/mocks';
import { getRuleMock } from '../../../../routes/__mocks__/request_responses';
import type { RuleParams } from '../../../../rule_schema';
import { normalizeCommonRuleFields } from './normalize_rule_fields_common';

describe('normalizeCommonRuleFields', () => {
  it('migrates legacy investigation fields', () => {
    const mockRule: SanitizedRule<RuleParams> = getRuleMock(
      getQueryRuleParams({
        investigationFields: ['field_1', 'field_2'],
      })
    );

    const result = normalizeCommonRuleFields(mockRule);

    expect(result.investigation_fields).toMatchObject({ field_names: ['field_1', 'field_2'] });
  });
});
