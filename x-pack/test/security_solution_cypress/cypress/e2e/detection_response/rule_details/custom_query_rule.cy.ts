/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertSuppression } from '@kbn/security-solution-plugin/common/api/detection_engine';

import { getDataViewRule, getSimpleCustomQueryRule } from '../../../objects/rule';
import { createRule } from '../../../tasks/api_calls/rules';
import { deleteAlertsAndRules, postDataView } from '../../../tasks/common';
import { login } from '../../../tasks/login';
import { checkDataViewDetails, confirmAlertSuppressionDetails } from '../../../tasks/rule_details';
import { ruleDetailsUrl } from '../../../urls/rule_details';
import { visit } from '../../../tasks/navigation';

describe('Custom query rule details', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    /* We don't call cleanKibana method on the before hook, instead we call esArchiverReseKibana on the before each. This is because we
      are creating a data view we'll use after and cleanKibana does not delete all the data views created, esArchiverReseKibana does.
      We don't use esArchiverReseKibana in all the tests because is a time-consuming method and we don't need to perform an exhaustive
      cleaning in all the other tests. */
    cy.task('esArchiverResetKibana');
    login();
  });

  describe('rule using index patterns', () => {
    const alertSuppressionOptions = {
      group_by: ['agent.name'],
      missing_fields_strategy: 'doNotSuppress',
    } as AlertSuppression;
    // Fill any custom query specific values you want tested,
    // common values across rules can be tested in ./common_flows.cy.ts
    const rule = getSimpleCustomQueryRule({
      alert_suppression: alertSuppressionOptions,
    });

    it('displays custom query rule details', () => {
      createRule(rule).then((createdRule) => {
        visit(ruleDetailsUrl(createdRule.body.id));
        confirmAlertSuppressionDetails(createdRule.body.alert_suppression);
      });
    });
  });

  describe('rule using data views', () => {
    const rule = getDataViewRule();

    beforeEach(() => {
      if (rule.data_view_id != null) {
        postDataView(rule.data_view_id);
      }
    });

    it('displays data view details', () => {
      createRule(rule).then((createdRule) => {
        visit(ruleDetailsUrl(createdRule.body.id));

        checkDataViewDetails(createdRule.body.data_view_id);
      });
    });
  });
});
