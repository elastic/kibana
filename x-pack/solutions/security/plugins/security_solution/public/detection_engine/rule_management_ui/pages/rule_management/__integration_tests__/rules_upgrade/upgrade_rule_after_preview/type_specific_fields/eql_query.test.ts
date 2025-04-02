/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import { KibanaServices } from '../../../../../../../../common/lib/kibana';
import { assertRuleUpgradePreview } from '../../mock/assert_rule_upgrade_preview';
import { assertRuleUpgradeAfterReview } from '../../mock/assert_rule_upgrade_after_review';

describe('Upgrade rule after preview - "eql_query" field', () => {
  beforeAll(() => {
    // Mock EQL validation response. It shouldn't contain "errors" field for a valid EQL query.
    (KibanaServices.get().data.search.search as jest.Mock).mockReturnValue(of({}));
  });

  describe.each([
    {
      ruleType: 'eql',
      fieldName: 'eql_query',
      humanizedFieldName: 'EQL query',
      initial: {
        query: 'any where true',
        language: 'eql',
        filters: [],
      },
      customized: {
        query: 'host where host.name == "something"',
        language: 'eql',
        filters: [],
      },
      upgrade: {
        query: 'process where process.name == "regsvr32.exe"',
        language: 'eql',
        filters: [],
      },
      resolvedValue: {
        query: 'process where event.name == "resolved"',
        language: 'eql',
        filters: [],
      },
    },
  ] as const)(
    '$fieldName ($ruleType rule)',
    ({ ruleType, fieldName, humanizedFieldName, initial, customized, upgrade, resolvedValue }) => {
      assertRuleUpgradePreview({
        ruleType,
        fieldName,
        humanizedFieldName,
        fieldVersions: {
          initial,
          customized,
          upgrade,
          resolvedValue,
        },
      });

      assertRuleUpgradeAfterReview({
        ruleType,
        fieldName,
        fieldVersions: {
          initial,
          customized,
          upgrade,
          resolvedValue,
        },
      });
    }
  );
});
