/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { BaseDefaultableFields } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { binaryToString, getCustomQueryRuleParams, parseNdJson } from '../../../utils';
import { deleteAllRules } from '../../../../../../common/utils/security_solution';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');

  describe('@ess @serverless @serverlessQA export_rules', () => {
    describe('exporting rules', () => {
      afterEach(async () => {
        await deleteAllRules(supertest, log);
      });

      it('should set the response content types to be expected', async () => {
        const ruleToExport = getCustomQueryRuleParams();

        await securitySolutionApi.createRule({ body: ruleToExport });

        await securitySolutionApi
          .exportRules({ query: {}, body: null })
          .expect(200)
          .expect('Content-Type', 'application/ndjson')
          .expect('Content-Disposition', 'attachment; filename="export.ndjson"');
      });

      it('should export a single rule with a rule_id', async () => {
        const ruleToExport = getCustomQueryRuleParams();

        await securitySolutionApi.createRule({ body: ruleToExport });

        const { body } = await securitySolutionApi
          .exportRules({ query: {}, body: null })
          .expect(200)
          .parse(binaryToString);

        const [exportedRule] = parseNdJson(body);

        expect(exportedRule).toMatchObject(ruleToExport);
      });

      it('exports a set of custom rules via the _export API', async () => {
        await Promise.all([
          securitySolutionApi
            .createRule({ body: getCustomQueryRuleParams({ rule_id: 'rule-id-1' }) })
            .expect(200),
          securitySolutionApi
            .createRule({ body: getCustomQueryRuleParams({ rule_id: 'rule-id-2' }) })
            .expect(200),
        ]);

        const { body: exportResult } = await securitySolutionApi
          .exportRules({ query: {}, body: null })
          .expect(200)
          .parse(binaryToString);

        const ndJson = parseNdJson(exportResult);

        expect(ndJson).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              rule_id: 'rule-id-1',
              rule_source: {
                type: 'internal',
              },
            }),
            expect.objectContaining({
              rule_id: 'rule-id-2',
              rule_source: {
                type: 'internal',
              },
            }),
          ])
        );
      });

      it('should export defaultable fields when values are set', async () => {
        const defaultableFields: BaseDefaultableFields = {
          max_signals: 200,
          related_integrations: [
            { package: 'package-a', version: '^1.2.3' },
            { package: 'package-b', integration: 'integration-b', version: '~1.1.1' },
          ],
          setup: '# some setup markdown',
          required_fields: [
            { name: '@timestamp', type: 'date' },
            { name: 'my-non-ecs-field', type: 'keyword' },
          ],
        };

        const ruleToExport = getCustomQueryRuleParams(defaultableFields);

        const expectedRule = {
          ...ruleToExport,
          required_fields: [
            { name: '@timestamp', type: 'date', ecs: true },
            { name: 'my-non-ecs-field', type: 'keyword', ecs: false },
          ],
        };

        await securitySolutionApi.createRule({ body: ruleToExport });

        const { body } = await securitySolutionApi
          .exportRules({ query: {}, body: null })
          .expect(200)
          .parse(binaryToString);

        const [exportedRule] = parseNdJson(body);

        expect(exportedRule).toMatchObject(expectedRule);
      });

      it('should have export summary reflecting a number of rules', async () => {
        const ruleToExport = getCustomQueryRuleParams();

        await securitySolutionApi.createRule({ body: ruleToExport });

        const { body } = await securitySolutionApi
          .exportRules({ query: {}, body: null })
          .expect(200)
          .parse(binaryToString);

        const [, exportSummary] = parseNdJson(body);

        expect(exportSummary).toMatchObject({
          exported_exception_list_count: 0,
          exported_exception_list_item_count: 0,
          exported_count: 1,
          exported_rules_count: 1,
        });
      });

      it('should export exactly two rules given two rules', async () => {
        const ruleToExport1 = getCustomQueryRuleParams({ rule_id: 'rule-1' });
        const ruleToExport2 = getCustomQueryRuleParams({ rule_id: 'rule-2' });

        await securitySolutionApi.createRule({ body: ruleToExport1 });
        await securitySolutionApi.createRule({ body: ruleToExport2 });

        const { body } = await securitySolutionApi
          .exportRules({ query: {}, body: null })
          .expect(200)
          .parse(binaryToString);

        const [exportedRule1, exportedRule2] = parseNdJson(body);

        expect([exportedRule1, exportedRule2]).toEqual(
          expect.arrayContaining([
            expect.objectContaining(ruleToExport1),
            expect.objectContaining(ruleToExport2),
          ])
        );
      });
    });
  });
};
