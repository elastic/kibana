/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  DETECTION_ENGINE_RULES_BULK_ACTION,
  DETECTION_ENGINE_RULES_URL,
  DETECTION_ENGINE_RULES_URL_FIND,
} from '@kbn/security-solution-plugin/common/constants';
import type {
  RuleCreateProps,
  RuleResponse,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { FetchRulesResponse } from '@kbn/security-solution-plugin/public/detection_engine/rule_management/logic/types';
import { internalAlertingSnoozeRule } from '../../urls/routes';
import { rootRequest } from './common';

export const findAllRules = () => {
  return rootRequest<FetchRulesResponse>({
    url: DETECTION_ENGINE_RULES_URL_FIND,
  });
};

export const createRule = (
  rule: RuleCreateProps
): Cypress.Chainable<Cypress.Response<RuleResponse>> => {
  return rootRequest<RuleResponse>({
    method: 'POST',
    url: DETECTION_ENGINE_RULES_URL,
    body: rule,
    failOnStatusCode: false,
  });
};

/**
 * Snoozes a rule via API
 *
 * @param id Rule's SO id
 * @param duration Snooze duration in milliseconds, -1 for indefinite
 */
export const snoozeRule = (id: string, duration: number): Cypress.Chainable =>
  rootRequest({
    method: 'POST',
    url: internalAlertingSnoozeRule(id),
    body: {
      snooze_schedule: {
        duration,
        rRule: { dtstart: new Date().toISOString(), count: 1, tzid: moment().format('zz') },
      },
    },
    failOnStatusCode: false,
  });

export const deleteCustomRule = (ruleId = '1') => {
  rootRequest({
    method: 'DELETE',
    url: `api/detection_engine/rules?rule_id=${ruleId}`,
    failOnStatusCode: false,
  });
};

export const importRule = (ndjsonPath: string) => {
  cy.fixture(ndjsonPath)
    .then((file) => Cypress.Blob.binaryStringToBlob(file))
    .then((blob) => {
      const formdata = new FormData();
      formdata.append('file', blob, ndjsonPath);

      rootRequest({
        url: 'api/detection_engine/rules/_import',
        method: 'POST',
        headers: {
          'content-type': 'multipart/form-data',
        },
        body: formdata,
      })
        .its('status')
        .should('be.equal', 200);
    });
};

export const waitForRulesToFinishExecution = (ruleIds: string[], afterDate?: Date) =>
  cy.waitUntil(
    () =>
      rootRequest<FetchRulesResponse>({
        method: 'GET',
        url: DETECTION_ENGINE_RULES_URL_FIND,
        headers: {
          'content-type': 'multipart/form-data',
        },
      }).then((response) => {
        const areAllRulesFinished = ruleIds.every((ruleId) =>
          response.body.data.some((rule) => {
            const ruleExecutionDate = rule.execution_summary?.last_execution?.date;

            const isDateOk = afterDate
              ? !!(ruleExecutionDate && new Date(ruleExecutionDate) > afterDate)
              : true;

            return (
              rule.rule_id === ruleId && typeof rule.execution_summary !== 'undefined' && isDateOk
            );
          })
        );
        return areAllRulesFinished;
      }),
    { interval: 500, timeout: 12000 }
  );

type EnableRulesParameters =
  | {
      names: string[];
      ids?: undefined;
    }
  | {
      names?: undefined;
      ids: string[];
    };

export const enableRules = ({ names, ids }: EnableRulesParameters): Cypress.Chainable => {
  const query = names?.map((name) => `alert.attributes.name: "${name}"`).join(' OR ');

  return rootRequest({
    method: 'POST',
    url: DETECTION_ENGINE_RULES_BULK_ACTION,
    body: {
      action: 'enable',
      query,
      ids,
    },
    failOnStatusCode: false,
  });
};
