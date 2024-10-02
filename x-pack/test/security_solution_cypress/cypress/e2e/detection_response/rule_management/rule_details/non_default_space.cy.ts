/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRule } from '../../../../tasks/api_calls/rules';
import { ruleFields } from '../../../../data/detection_engine';
import { getExistingRule, getNewRule } from '../../../../objects/rule';

import { RULE_NAME_HEADER, RULE_SWITCH } from '../../../../screens/rule_details';

import { createTimeline } from '../../../../tasks/api_calls/timelines';
import { deleteAlertsAndRules, deleteConnectors } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { activateSpace, getSpaceUrl } from '../../../../tasks/space';
import { visit } from '../../../../tasks/navigation';
import { ruleDetailsUrl } from '../../../../urls/rule_details';

describe('Non-default space rule detail page', { tags: ['@ess'] }, function () {
  const SPACE_ID = 'test';

  beforeEach(() => {
    login();
    activateSpace(SPACE_ID);
    deleteAlertsAndRules();
    deleteConnectors();
    createTimeline().then((response) => {
      createRule({
        ...getNewRule({
          rule_id: 'rulez',
          description: ruleFields.ruleDescription,
          name: ruleFields.ruleName,
          severity: ruleFields.ruleSeverity,
          risk_score: ruleFields.riskScore,
          tags: ruleFields.ruleTags,
          false_positives: ruleFields.falsePositives,
          note: ruleFields.investigationGuide,
          timeline_id: response.body.data.persistTimeline.timeline.savedObjectId,
          timeline_title: response.body.data.persistTimeline.timeline.title ?? '',
          interval: ruleFields.ruleInterval,
          from: `now-1h`,
          query: ruleFields.ruleQuery,
          enabled: false,
          max_signals: 500,
          threat: [
            {
              ...ruleFields.threat,
              technique: [
                {
                  ...ruleFields.threatTechnique,
                  subtechnique: [ruleFields.threatSubtechnique],
                },
              ],
            },
          ],
        }),
      }).then((rule) => {
        cy.wrap(rule.body.id).as('ruleId');
      });
    });
  });

  it('Check responsiveness by enabling/disabling the rule', function () {
    visit(getSpaceUrl(SPACE_ID, ruleDetailsUrl(this.ruleId)));
    cy.get(RULE_NAME_HEADER).should('contain', ruleFields.ruleName);

    cy.intercept(
      'POST',
      getSpaceUrl(SPACE_ID, '/api/detection_engine/rules/_bulk_action?dry_run=false')
    ).as('bulk_action');
    cy.get(RULE_SWITCH).should('be.visible');
    cy.get(RULE_SWITCH).click();
    cy.wait('@bulk_action').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.wrap(response?.body.attributes.results.updated[0].max_signals).should(
        'eql',
        getExistingRule().max_signals
      );
      cy.wrap(response?.body.attributes.results.updated[0].enabled).should('eql', true);
    });
  });
});
