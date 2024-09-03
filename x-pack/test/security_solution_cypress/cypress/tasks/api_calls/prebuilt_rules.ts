/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PerformRuleInstallationResponseBody,
  PERFORM_RULE_INSTALLATION_URL,
  BOOTSTRAP_PREBUILT_RULES_URL,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { ELASTIC_SECURITY_RULE_ID } from '@kbn/security-solution-plugin/common/detection_engine/constants';
import type { PrePackagedRulesStatusResponse } from '@kbn/security-solution-plugin/public/detection_engine/rule_management/logic/types';
import { getPrebuiltRuleWithExceptionsMock } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/mocks';
import { createRuleAssetSavedObject } from '../../helpers/rules';
import { rootRequest } from './common';

export const getPrebuiltRulesStatus = () => {
  return rootRequest<PrePackagedRulesStatusResponse>({
    method: 'GET',
    url: 'api/detection_engine/rules/prepackaged/_status',
  });
};

export const SAMPLE_PREBUILT_RULE = createRuleAssetSavedObject({
  ...getPrebuiltRuleWithExceptionsMock(),
  rule_id: ELASTIC_SECURITY_RULE_ID,
  tags: ['test-tag-1'],
  enabled: true,
});

/* Install all prebuilt rules available as security-rule saved objects
 * Use in combination with `preventPrebuiltRulesPackageInstallation` and
 * `createNewRuleAsset` to create mocked prebuilt rules and install only those
 * instead of all rules available in the `security_detection_engine` package
 */
export const installAllPrebuiltRulesRequest = () =>
  rootRequest<PerformRuleInstallationResponseBody>({
    method: 'POST',
    url: PERFORM_RULE_INSTALLATION_URL,
    body: {
      mode: 'ALL_RULES',
    },
    headers: {
      'elastic-api-version': '1',
    },
  });

/* Install specific prebuilt rules. Should be available as security-rule saved objects
/* as a prerequisite for this request to succeed.
 * Use in combination with `preventPrebuiltRulesPackageInstallation` and
 * `createNewRuleAsset` to create mocked prebuilt rules and install only those
 * instead of all rules available in the `security_detection_engine` package
 */
export const installSpecificPrebuiltRulesRequest = (rules: Array<typeof SAMPLE_PREBUILT_RULE>) =>
  rootRequest<PerformRuleInstallationResponseBody>({
    method: 'POST',
    url: PERFORM_RULE_INSTALLATION_URL,
    body: {
      mode: 'SPECIFIC_RULES',
      rules: rules.map((rule) => ({
        rule_id: rule['security-rule'].rule_id,
        version: rule['security-rule'].version,
      })),
    },
    headers: {
      'elastic-api-version': '1',
    },
  });

export const getAvailablePrebuiltRulesCount = () => {
  cy.log('Get prebuilt rules count');
  return getPrebuiltRulesStatus().then(({ body }) => {
    const prebuiltRulesCount = body.rules_installed + body.rules_not_installed;

    return prebuiltRulesCount;
  });
};

export const waitTillPrebuiltRulesReadyToInstall = () => {
  cy.waitUntil(
    () => {
      return getAvailablePrebuiltRulesCount().then((availablePrebuiltRulesCount) => {
        return availablePrebuiltRulesCount > 0;
      });
    },
    { interval: 2000, timeout: 60000 }
  );
};

/**
 * Install all prebuilt rules.
 *
 * This is a heavy request and should be used with caution. Most likely you
 * don't need all prebuilt rules to be installed, crating just a few prebuilt
 * rules should be enough for most cases.
 */
export const excessivelyInstallAllPrebuiltRules = () => {
  cy.log('Install prebuilt rules (heavy request)');
  waitTillPrebuiltRulesReadyToInstall();
  installAllPrebuiltRulesRequest();
};

export const createNewRuleAsset = ({
  index = '.kibana_security_solution',
  rule = SAMPLE_PREBUILT_RULE,
}: {
  index?: string;
  rule?: typeof SAMPLE_PREBUILT_RULE;
}) => {
  const url = `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_doc/security-rule:${
    rule['security-rule'].rule_id
  }?refresh`;
  cy.log('URL', url);
  cy.waitUntil(
    () => {
      return cy
        .request({
          method: 'PUT',
          url,
          headers: {
            'Content-Type': 'application/json',
          },
          failOnStatusCode: false,
          body: rule,
        })
        .then((response) => response.status === 200);
    },
    { interval: 500, timeout: 12000 }
  );
};

export const bulkCreateRuleAssets = ({
  index = '.kibana_security_solution',
  rules = [SAMPLE_PREBUILT_RULE],
}: {
  index?: string;
  rules?: Array<typeof SAMPLE_PREBUILT_RULE>;
}) => {
  cy.log(
    'Bulk Install prebuilt rules',
    rules?.map((rule) => rule['security-rule'].rule_id).join(', ')
  );
  const url = `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_bulk?refresh`;

  const bulkIndexRequestBody = rules.reduce((body, rule) => {
    const indexOperation = {
      index: {
        _index: index,
        _id: `security-rule:${rule['security-rule'].rule_id}`,
      },
    };

    const documentData = JSON.stringify(rule);
    return body.concat(JSON.stringify(indexOperation), '\n', documentData, '\n');
  }, '');

  rootRequest({
    method: 'PUT',
    url: `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_mapping`,
    body: {
      dynamic: true,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  cy.waitUntil(
    () => {
      return rootRequest({
        method: 'POST',
        url,
        headers: { 'Content-Type': 'application/json' },
        failOnStatusCode: false,
        body: bulkIndexRequestBody,
      }).then((response) => response.status === 200);
    },
    { interval: 500, timeout: 12000 }
  );
};

export const getRuleAssets = (index: string | undefined = '.kibana_security_solution') => {
  const url = `${Cypress.env('ELASTICSEARCH_URL')}/${index}/_search?size=10000`;
  return rootRequest({
    method: 'GET',
    url,
    headers: {
      'Content-Type': 'application/json',
    },
    failOnStatusCode: false,
    body: {
      query: {
        term: { type: { value: 'security-rule' } },
      },
    },
  });
};

/* Prevent the installation of the `security_detection_engine` package from Fleet
/* by intercepting the request and returning a mock empty object as response
/* Used primarily to prevent the unwanted installation of "real" prebuilt rules
/* during e2e tests, and allow for manual installation of mock rules instead. */
export const preventPrebuiltRulesPackageInstallation = () => {
  cy.log('Prevent prebuilt rules package installation');
  cy.intercept('POST', BOOTSTRAP_PREBUILT_RULES_URL, {});
};

/**
 * Install prebuilt rule assets. After installing these assets become available to be installed
 * as prebuilt rules. Prebuilt rule assets can be generated via `createRuleAssetSavedObject()` helper function.
 *
 * It's also important to take into account that the business logic tries to fetch prebuilt rules Fleet package
 * and you need to add `preventPrebuiltRulesPackageInstallation()` to `beforeEach` section (before visit commands)
 * to avoid actually pulling a real Fleet package and have only the mocked prebuilt rule assets for testing.
 */
export const installPrebuiltRuleAssets = (ruleAssets: Array<typeof SAMPLE_PREBUILT_RULE>): void => {
  cy.log('Create mocked available to install prebuilt rules', ruleAssets.length);
  preventPrebuiltRulesPackageInstallation();

  bulkCreateRuleAssets({ rules: ruleAssets });
};

/**
 * Prevent the installation of the `security_detection_engine` package from Fleet.
 * The create a `security-rule` asset for each rule provided in the `rules` array.
 *
 * * @param {Array} rules - Rule assets to be created and optionally installed
 *
 */
export const createAndInstallMockedPrebuiltRules = (
  ruleAssets: Array<typeof SAMPLE_PREBUILT_RULE>
) => {
  preventPrebuiltRulesPackageInstallation();
  // Install assets into ES as `security-rule` SOs
  installPrebuiltRuleAssets(ruleAssets);

  // Install rules into Kibana as `alerts` SOs
  return installSpecificPrebuiltRulesRequest(ruleAssets);
};
