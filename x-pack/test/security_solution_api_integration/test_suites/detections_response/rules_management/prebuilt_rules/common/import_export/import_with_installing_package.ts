/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import {
  deleteAllPrebuiltRuleAssets,
  installPrebuiltRules,
  importRulesWithSuccess,
  installMockPrebuiltRulesPackage,
  deletePrebuiltRulesFleetPackage,
} from '../../../../utils';
import { deleteAllRules } from '../../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const securitySolutionApi = getService('securitySolutionApi');
  const retryService = getService('retry');

  // Prebuilt rules matching rules in the mock package
  const PREBUILT_RULE_ID_A = 'test-prebuilt-rule-a';
  const NON_CUSTOMIZED_PREBUILT_RULE = {
    rule_id: PREBUILT_RULE_ID_A,
    version: 3,
    type: 'query',
    name: 'Mock rule A from mock 99.0.0 package',
    description: 'Mock rule A from mock 99.0.0 package',
    risk_score: 47,
    severity: 'medium',
    from: 'now-30m',
    index: ['test-*'],
    author: ['Elastic'],
    license: 'Elastic License v2',
    query: '*:*',
    language: 'kuery',
    immutable: true,
    rule_source: {
      type: 'external',
      is_customized: false,
    },
  };
  const PREBUILT_RULE_ID_B = 'test-prebuilt-rule-b';
  const CUSTOMIZED_PREBUILT_RULE = {
    rule_id: PREBUILT_RULE_ID_B,
    version: 3,
    type: 'eql',
    name: 'Mock rule B from mock 99.0.0 package',
    description: 'Custom description',
    tags: ['custom-tag'],
    risk_score: 47,
    severity: 'medium',
    from: 'now-30m',
    index: ['test-*'],
    author: ['Elastic'],
    license: 'Elastic License v2',
    query: 'any where true',
    language: 'eql',
    immutable: true,
    rule_source: {
      type: 'external',
      is_customized: true,
    },
  };

  describe('@ess @serverless @skipInServerlessMKI Import prebuilt rules when the package is not installed', () => {
    beforeEach(async () => {
      await deletePrebuiltRulesFleetPackage({ supertest, es, log, retryService });
      await deleteAllRules(supertest, log);
      await deleteAllPrebuiltRuleAssets(es, log);
    });

    after(async () => {
      await deleteAllPrebuiltRuleAssets(es, log);
      await deleteAllRules(supertest, log);
    });

    const IMPORT_PAYLOAD = [
      {
        ...NON_CUSTOMIZED_PREBUILT_RULE,
        immutable: true,
        rule_source: {
          type: 'external',
          is_customized: false,
        },
      },
      {
        ...CUSTOMIZED_PREBUILT_RULE,
        immutable: true,
        rule_source: {
          type: 'external',
          is_customized: true,
        },
      },
    ];

    it('imports new prebuilt rules', async () => {
      await importRulesWithSuccess({
        getService,
        rules: IMPORT_PAYLOAD,
        overwrite: false,
      });

      const {
        body: { data: importedRules },
      } = await securitySolutionApi
        .findRules({
          query: {},
        })
        .expect(200);

      expect(importedRules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_A,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          }),
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_B,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: true,
            },
          }),
        ])
      );

      expect(importedRules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_A,
            version: 3,
            revision: 0,
          }),
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_B,
            version: 3,
            revision: 0,
          }),
        ])
      );

      expect(importedRules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ...NON_CUSTOMIZED_PREBUILT_RULE,
            rule_id: PREBUILT_RULE_ID_A,
          }),
          expect.objectContaining({
            ...CUSTOMIZED_PREBUILT_RULE,
            rule_id: PREBUILT_RULE_ID_B,
          }),
        ])
      );
    });

    it('imports prebuilt rules on top of existing rules', async () => {
      // Package installation is rate limited. A single package installation is allowed per 10 seconds.
      await retryService.tryWithRetries(
        'installSecurityDetectionEnginePackage',
        async () => await installMockPrebuiltRulesPackage(es, supertest),
        {
          retryCount: 5,
          retryDelay: 5000,
          timeout: 15000, // total timeout applied to all attempts altogether
        }
      );
      await installPrebuiltRules(es, supertest);
      await deletePrebuiltRulesFleetPackage({ supertest, es, log, retryService });

      await importRulesWithSuccess({
        getService,
        rules: IMPORT_PAYLOAD,
        overwrite: true,
      });

      const {
        body: { data: importedRules },
      } = await securitySolutionApi
        .findRules({
          query: {},
        })
        .expect(200);

      expect(importedRules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_A,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: false,
            },
          }),
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_B,
            immutable: true,
            rule_source: {
              type: 'external',
              is_customized: true,
            },
          }),
        ])
      );

      expect(importedRules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_A,
            version: 3,
            revision: 0,
          }),
          expect.objectContaining({
            rule_id: PREBUILT_RULE_ID_B,
            version: 3,
            revision: 1,
          }),
        ])
      );

      expect(importedRules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ...NON_CUSTOMIZED_PREBUILT_RULE,
            rule_id: PREBUILT_RULE_ID_A,
          }),
          expect.objectContaining({
            ...CUSTOMIZED_PREBUILT_RULE,
            rule_id: PREBUILT_RULE_ID_B,
          }),
        ])
      );
    });
  });
};
