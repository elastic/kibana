/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { deleteAllPrebuiltRuleAssets, getCustomQueryRuleParams } from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { combineToNdJson } from '../../../../utils/combine_to_ndjson';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const securitySolutionApi = getService('securitySolutionApi');
  const supertest = getService('supertest');
  const log = getService('log');

  describe('@ess @serverless @skipInServerlessMKI Import - Customization Disabled', () => {
    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    it(`does NOT allow importing non-customized prebuilt rules`, async () => {
      const ruleToImport = getCustomQueryRuleParams({
        rule_id: 'non-customized-prebuilt-rule',
        // @ts-expect-error the API supports this param, but we only need it in {@link RuleToImport}
        immutable: true,
        rule_source: { type: 'external', is_customized: false },
      });
      const ndjson = combineToNdJson(ruleToImport);

      const { body } = await securitySolutionApi
        .importRules({ query: {} })
        .attach('file', Buffer.from(ndjson), 'rules.ndjson')
        .expect(200);

      expect(body).toMatchObject({
        success: false,
        errors: [
          {
            rule_id: 'non-customized-prebuilt-rule',
            error: {
              status_code: 400,
              message:
                'Importing prebuilt rules is not supported. To import this rule as a custom rule, first duplicate the rule and then export it. [rule_id: non-customized-prebuilt-rule]',
            },
          },
        ],
      });
    });
  });
};
