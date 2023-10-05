/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CoverageOverviewFilter,
  CoverageOverviewRuleActivity,
  CoverageOverviewRuleSource,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import expect from 'expect';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  createPrebuiltRuleAssetSavedObjects,
  createRule,
  deleteAllRules,
  getCoverageOverviewData,
  getRuleForSignalTesting,
  installPrebuiltRules,
} from '../../utils';
import { createRuleAssetSavedObject } from '../../utils/prebuilt_rules/create_prebuilt_rule_saved_objects';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  const getMockThreatData = (id: string) => [
    {
      framework: 'MITRE ATT&CK',
      tactic: { id, name: 'test-name', reference: 'test.com' },
    },
  ];

  let enabledCustomRuleId: string;
  let disabledCustomRuleId: string;
  let enabledPrebuiltRuleId: string;
  let disabledPrebuiltRuleId: string;

  describe('coverage_overview', () => {
    beforeEach(async () => {
      // create enabled rule
      const enabledRule = {
        ...getRuleForSignalTesting(['auditbeat-*'], 'enabled-custom-rule'),
        threat: getMockThreatData('tactic-1'),
      };
      const enabledRuleBody = await createRule(supertest, log, enabledRule);
      enabledCustomRuleId = enabledRuleBody.id;

      // create disabled rule
      const disabledRule = {
        ...getRuleForSignalTesting(['auditbeat-*'], 'disabled-custom-rule', false),
        threat: getMockThreatData('tactic-2'),
      };
      const disabledRuleBody = await createRule(supertest, log, disabledRule);
      disabledCustomRuleId = disabledRuleBody.id;

      // create/install enabled and disabled prebuilt rules
      await createPrebuiltRuleAssetSavedObjects(es, [
        createRuleAssetSavedObject({
          rule_id: 'enabled-prebuilt-rule',
          enabled: true,
          threat: getMockThreatData('tactic-3'),
        }),
        createRuleAssetSavedObject({
          rule_id: 'disabled-prebuilt-rule',
          threat: getMockThreatData('tactic-4'),
        }),
      ]);
      const {
        results: { created },
      } = await installPrebuiltRules(es, supertest);
      if (created[0].enabled) {
        enabledPrebuiltRuleId = created[0].id;
        disabledPrebuiltRuleId = created[1].id;
      } else {
        enabledPrebuiltRuleId = created[1].id;
        disabledPrebuiltRuleId = created[0].id;
      }
    });

    afterEach(async () => {
      await deleteAllRules(supertest, log);
    });

    it('works with no rule data present', async () => {
      await deleteAllRules(supertest, log);
      const response = await getCoverageOverviewData(supertest);
      expect(response).toEqual({
        coverage: {},
        unmapped_rule_ids: [],
        rules_data: {},
      });
    });

    it('returns the correct rule data', async () => {
      const response = await getCoverageOverviewData(supertest);
      expect(response).toEqual({
        coverage: {
          'tactic-1': [enabledCustomRuleId],
          'tactic-2': [disabledCustomRuleId],
          'tactic-3': [enabledPrebuiltRuleId],
          'tactic-4': [disabledPrebuiltRuleId],
        },
        unmapped_rule_ids: [],
        rules_data: {
          [enabledCustomRuleId]: {
            name: 'Signal Testing Query',
            activity: 'enabled',
          },
          [disabledCustomRuleId]: {
            name: 'Signal Testing Query',
            activity: 'disabled',
          },
          [enabledPrebuiltRuleId]: {
            name: 'Query with a rule id',
            activity: 'enabled',
          },
          [disabledPrebuiltRuleId]: {
            name: 'Query with a rule id',
            activity: 'disabled',
          },
        },
      });
    });

    describe('filters', () => {
      it('correctly filters on enabled rules', async () => {
        const filter: CoverageOverviewFilter = { activity: [CoverageOverviewRuleActivity.Enabled] };
        const response = await getCoverageOverviewData(supertest, filter);
        expect(response).toEqual({
          coverage: {
            'tactic-1': [enabledCustomRuleId],
            'tactic-3': [enabledPrebuiltRuleId],
          },
          unmapped_rule_ids: [],
          rules_data: {
            [enabledCustomRuleId]: {
              name: 'Signal Testing Query',
              activity: 'enabled',
            },
            [enabledPrebuiltRuleId]: {
              name: 'Query with a rule id',
              activity: 'enabled',
            },
          },
        });
      });

      it('correctly filters on disabled rules', async () => {
        const filter: CoverageOverviewFilter = {
          activity: [CoverageOverviewRuleActivity.Disabled],
        };
        const response = await getCoverageOverviewData(supertest, filter);
        expect(response).toEqual({
          coverage: {
            'tactic-2': [disabledCustomRuleId],
            'tactic-4': [disabledPrebuiltRuleId],
          },
          unmapped_rule_ids: [],
          rules_data: {
            [disabledCustomRuleId]: {
              name: 'Signal Testing Query',
              activity: 'disabled',
            },

            [disabledPrebuiltRuleId]: {
              name: 'Query with a rule id',
              activity: 'disabled',
            },
          },
        });
      });

      it('correctly filters on custom rules', async () => {
        const filter: CoverageOverviewFilter = {
          source: [CoverageOverviewRuleSource.Custom],
        };
        const response = await getCoverageOverviewData(supertest, filter);
        expect(response).toEqual({
          coverage: {
            'tactic-1': [enabledCustomRuleId],
            'tactic-2': [disabledCustomRuleId],
          },
          unmapped_rule_ids: [],
          rules_data: {
            [enabledCustomRuleId]: {
              name: 'Signal Testing Query',
              activity: 'enabled',
            },
            [disabledCustomRuleId]: {
              name: 'Signal Testing Query',
              activity: 'disabled',
            },
          },
        });
      });

      it('correctly filters on prebuilt rules', async () => {
        const filter: CoverageOverviewFilter = {
          source: [CoverageOverviewRuleSource.Prebuilt],
        };
        const response = await getCoverageOverviewData(supertest, filter);
        expect(response).toEqual({
          coverage: {
            'tactic-3': [enabledPrebuiltRuleId],
            'tactic-4': [disabledPrebuiltRuleId],
          },
          unmapped_rule_ids: [],
          rules_data: {
            [enabledPrebuiltRuleId]: {
              name: 'Query with a rule id',
              activity: 'enabled',
            },
            [disabledPrebuiltRuleId]: {
              name: 'Query with a rule id',
              activity: 'disabled',
            },
          },
        });
      });

      it('correctly filters on multiple fields', async () => {
        const filter: CoverageOverviewFilter = {
          source: [CoverageOverviewRuleSource.Prebuilt, CoverageOverviewRuleSource.Custom],
          activity: [CoverageOverviewRuleActivity.Enabled, CoverageOverviewRuleActivity.Disabled],
        };
        const response = await getCoverageOverviewData(supertest, filter);
        expect(response).toEqual({
          coverage: {
            'tactic-1': [enabledCustomRuleId],
            'tactic-2': [disabledCustomRuleId],
            'tactic-3': [enabledPrebuiltRuleId],
            'tactic-4': [disabledPrebuiltRuleId],
          },
          unmapped_rule_ids: [],
          rules_data: {
            [enabledCustomRuleId]: {
              name: 'Signal Testing Query',
              activity: 'enabled',
            },
            [disabledCustomRuleId]: {
              name: 'Signal Testing Query',
              activity: 'disabled',
            },
            [enabledPrebuiltRuleId]: {
              name: 'Query with a rule id',
              activity: 'enabled',
            },
            [disabledPrebuiltRuleId]: {
              name: 'Query with a rule id',
              activity: 'disabled',
            },
          },
        });
      });

      it('correctly filters on search_term field', async () => {
        const filter: CoverageOverviewFilter = {
          search_term: 'tactic-1',
        };
        const response = await getCoverageOverviewData(supertest, filter);
        expect(response).toEqual({
          coverage: {
            'tactic-1': [enabledCustomRuleId],
          },
          unmapped_rule_ids: [],
          rules_data: {
            [enabledCustomRuleId]: {
              name: 'Signal Testing Query',
              activity: 'enabled',
            },
          },
        });
      });
    });
  });
};
