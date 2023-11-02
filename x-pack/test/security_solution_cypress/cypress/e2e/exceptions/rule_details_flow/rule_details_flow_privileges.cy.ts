/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ROLES, SecurityRoleName } from '@kbn/security-solution-plugin/common/test';

import { getExceptionList } from '../../../objects/exception';
import { getNewRule } from '../../../objects/rule';
import { createRule } from '../../../tasks/api_calls/rules';
import { login } from '../../../tasks/login';
import { goToExceptionsTab } from '../../../tasks/rule_details';
import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  NO_EXCEPTIONS_EXIST_PROMPT,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  ADD_EXCEPTIONS_BTN_FROM_VIEWER_HEADER,
  ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN,
} from '../../../screens/exceptions';
import { EXCEPTION_ITEM_ACTIONS_BUTTON } from '../../../screens/rule_details';
import {
  createExceptionList,
  createExceptionListItem,
  deleteExceptionList,
} from '../../../tasks/api_calls/exceptions';
import { ruleDetailsUrl } from '../../../urls/rule_details';
import { visit } from '../../../tasks/navigation';

const CAN_ADD_EXCEPTION: SecurityRoleName[] = [
  ROLES.t3_analyst,
  // ROLES.threat_intelligence_analyst,
  ROLES.rule_author,
  ROLES.detections_admin,
  ROLES.soc_manager,
  ROLES.platform_engineer,
  ROLES.endpoint_policy_manager,
];

const CANNOT_ADD_EXCEPTION: SecurityRoleName[] = [
  ROLES.t1_analyst,
  ROLES.t2_analyst,
  // ROLES.endpoint_operations_analyst,
];

describe('Rule details flow exceptions privileges', { tags: ['@ess', '@serverless'] }, () => {
  const exceptionList = getExceptionList();

  describe('empty state', () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      deleteExceptionList(exceptionList.list_id, exceptionList.namespace_type);
    });

    CANNOT_ADD_EXCEPTION.forEach((role) => {
      it(`${role} cannot add an exception from empty viewer screen`, () => {
        login(role);
        createRule(
          getNewRule({
            name: 'Test exceptions rule',
            query: 'agent.name:*',
            index: ['exceptions*'],
            rule_id: '2',
          })
        ).then((rule) => {
          visit(ruleDetailsUrl(rule.body.id));
        });

        goToExceptionsTab();

        // when no exceptions exist, empty component shows with action to add exception
        cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

        // cannot add an exception from empty view
        cy.get(ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN).should('have.attr', 'disabled');
      });
    });

    CAN_ADD_EXCEPTION.forEach((role) => {
      it(`${role} can add an exception from empty viewer screen`, () => {
        login(role);
        createRule(
          getNewRule({
            name: 'Test exceptions rule',
            query: 'agent.name:*',
            index: ['exceptions*'],
            rule_id: '2',
          })
        ).then((rule) => {
          visit(ruleDetailsUrl(rule.body.id));
        });

        goToExceptionsTab();

        // when no exceptions exist, empty component shows with action to add exception
        cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

        // cannot add an exception from empty view
        cy.get(ADD_EXCEPTIONS_BTN_FROM_EMPTY_PROMPT_BTN).should('not.have.attr', 'disabled');
      });
    });
  });

  describe('non empty state', () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      deleteExceptionList(exceptionList.list_id, exceptionList.namespace_type);
    });

    CANNOT_ADD_EXCEPTION.forEach((role) => {
      it(`${role} cannot take actions on exception`, () => {
        login(role);
        createExceptionList(exceptionList, exceptionList.list_id)
          .then((response) => {
            return createRule(
              getNewRule({
                name: 'Test exceptions rule',
                query: 'agent.name:*',
                index: ['exceptions*'],
                exceptions_list: [
                  {
                    id: response.body.id,
                    list_id: exceptionList.list_id,
                    type: exceptionList.type,
                    namespace_type: exceptionList.namespace_type,
                  },
                ],
                rule_id: '2',
              })
            );
          })
          .then((rule) => {
            visit(ruleDetailsUrl(rule.body.id));
          });
        createExceptionListItem(exceptionList.list_id, {
          list_id: exceptionList.list_id,
          item_id: 'simple_list_item',
          tags: [],
          type: 'simple',
          description: 'Test exception item',
          name: 'Sample Exception List Item',
          namespace_type: 'single',
          entries: [
            {
              field: 'unique_value.test',
              operator: 'included',
              type: 'match_any',
              value: ['bar'],
            },
          ],
        });
        goToExceptionsTab();

        // can view exceptions
        cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

        // cannot access edit/delete actions of item
        cy.get(EXCEPTION_ITEM_ACTIONS_BUTTON).should('have.attr', 'disabled');

        // does not display add exception button
        cy.get(ADD_EXCEPTIONS_BTN_FROM_VIEWER_HEADER).should('not.exist');
      });
    });

    CAN_ADD_EXCEPTION.forEach((role) => {
      it(`${role} can take actions on exception`, () => {
        login(role);
        createExceptionList(exceptionList, exceptionList.list_id).then((response) => {
          createRule(
            getNewRule({
              name: 'Test exceptions rule',
              query: 'agent.name:*',
              index: ['exceptions*'],
              exceptions_list: [
                {
                  id: response.body.id,
                  list_id: exceptionList.list_id,
                  type: exceptionList.type,
                  namespace_type: exceptionList.namespace_type,
                },
              ],
              rule_id: '2',
            })
          ).then((rule) => {
            createExceptionListItem(exceptionList.list_id, {
              list_id: exceptionList.list_id,
              item_id: 'simple_list_item',
              tags: [],
              type: 'simple',
              description: 'Test exception item',
              name: 'Sample Exception List Item',
              namespace_type: 'single',
              entries: [
                {
                  field: 'unique_value.test',
                  operator: 'included',
                  type: 'match_any',
                  value: ['bar'],
                },
              ],
            });
            visit(ruleDetailsUrl(rule.body.id));
          });
        });
        goToExceptionsTab();

        // can view exceptions
        cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('not.exist');
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

        // can access edit/delete actions of item
        cy.get(EXCEPTION_ITEM_ACTIONS_BUTTON).should('not.have.attr', 'disabled');

        // does not display add exception button
        cy.get(ADD_EXCEPTIONS_BTN_FROM_VIEWER_HEADER).should('exist');
      });
    });
  });
});
