/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GAP_AUTO_FILL_STATUS_BADGE,
  RULE_GAPS_OVERVIEW_PANEL,
} from '../../../../screens/rule_gaps';

import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { deleteGapAutoFillScheduler } from '../../../../tasks/api_calls/gaps';
import { RULES_MONITORING_TAB } from '../../../../screens/alerts_detection_rules';
import { startBasicLicense } from '../../../../tasks/api_calls/licensing';
import { login } from '../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getCustomQueryRuleParams } from '../../../../objects/rule';

describe(
  'Rule gaps auto fill status - Basic license',
  {
    tags: ['@ess'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          '--xpack.alerting.gapAutoFillScheduler.enabled=true',
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'gapAutoFillSchedulerEnabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      login();
      deleteAlertsAndRules();
      deleteGapAutoFillScheduler();
      startBasicLicense();
      createRule(
        getCustomQueryRuleParams({ rule_id: '1', name: 'Rule 1', interval: '1m', from: 'now-1m' })
      );
    });

    it('hides the badge for basic licenses', () => {
      visitRulesManagementTable();
      cy.get(RULES_MONITORING_TAB).click();
      cy.get(RULE_GAPS_OVERVIEW_PANEL).should('exist');
      cy.get(GAP_AUTO_FILL_STATUS_BADGE).should('not.exist');
    });
  }
);
