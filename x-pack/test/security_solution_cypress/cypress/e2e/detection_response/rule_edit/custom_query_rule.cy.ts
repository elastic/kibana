/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertSuppression,
  QueryRule,
  QueryRuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getDataViewRule, getSimpleCustomQueryRule } from '../../../objects/rule';

import { createRule } from '../../../tasks/api_calls/rules';
import { deleteAlertsAndRules, postDataView } from '../../../tasks/common';
import {
  confirmEditStepSchedule,
  editAlertSuppression,
  confirmEditDefineStepDetails,
  confirmEditAboutStepDetails,
  goToAboutStepTab,
  goToActionsStepTab,
  goToScheduleStepTab,
  editRuleIndices,
  editRuleQuery,
  saveEditedRule,
  visitEditRulePage,
  editRuleDataViewSelection,
} from '../../../tasks/rule_edit';

import { login } from '../../../tasks/login';
import {
  confirmRuleDetailsAbout,
  confirmCustomQueryRuleDetailsDefinition,
  confirmRuleDetailsSchedule,
} from '../../../tasks/rule_details';
import { CreateRulePropsRewrites } from '../../../objects/types';

describe('Custom query rule - rule edit', { tags: ['@ess', '@serverless'] }, () => {
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
    const originalRule = getSimpleCustomQueryRule();

    beforeEach(() => {
      createRule<QueryRule>(originalRule).then((createdRule) => {
        visitEditRulePage(createdRule.body.id);
      });
    });

    it('Allows a rule to be edited', () => {
      const alertSuppressionOptions = {
        group_by: ['agent.name'],
        missing_fields_strategy: 'doNotSuppress',
      } as AlertSuppression;
      // Fill any custom query specific values you want tested,
      // common values across rules can be tested in ./common_flows.cy.ts
      const ruleEdits: CreateRulePropsRewrites<QueryRuleCreateProps> = {
        index: ['auditbeat*'],
        query: '*:*',
        alert_suppression: alertSuppressionOptions,
      };
      const editedRule = getSimpleCustomQueryRule(ruleEdits);

      cy.log('Checking define step populates');
      confirmEditDefineStepDetails(originalRule);

      cy.log('Updating define step');
      editAlertSuppression(alertSuppressionOptions);
      editRuleIndices(ruleEdits.index);
      editRuleQuery(ruleEdits.query);

      cy.log('Checking about step populates');
      goToAboutStepTab();
      confirmEditAboutStepDetails(originalRule);

      cy.log('Checking schedule step populates');
      goToScheduleStepTab();
      confirmEditStepSchedule(originalRule.interval);

      // NOTE: Missing test to confirm actions step is
      // populated as expected
      goToActionsStepTab();

      saveEditedRule();

      // Not checking withing the above await because confirming that
      // edits persisted, checking against the response would not catch
      // if an expected changed value was not persisted.
      confirmRuleDetailsAbout(editedRule);
      confirmCustomQueryRuleDetailsDefinition(editedRule);
      confirmRuleDetailsSchedule(editedRule);
    });
  });

  describe('rule using data views', () => {
    const originalRule = getDataViewRule();
    const editedRule = getDataViewRule({
      data_view_id: 'security-solution-default',
    });

    beforeEach(() => {
      if (originalRule.data_view_id != null) {
        postDataView(originalRule.data_view_id);
      }
      createRule<QueryRule>(originalRule).then((createdRule) => {
        visitEditRulePage(createdRule.body.id);
      });
    });

    it('Allows a rule data view to be edited', () => {
      cy.log('Checking define step populates');
      confirmEditDefineStepDetails(originalRule);

      cy.log('Updating data view selection');
      editRuleDataViewSelection('.alerts');

      cy.log('Checking about step populates');
      goToAboutStepTab();
      confirmEditAboutStepDetails(originalRule);

      cy.log('Checking schedule step populates');
      goToScheduleStepTab();
      confirmEditStepSchedule(originalRule.interval);

      saveEditedRule();

      cy.log('Checking for updated data view');
      confirmCustomQueryRuleDetailsDefinition(editedRule);
    });
  });
});
