/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { epmRouteService } from '@kbn/fleet-plugin/common';
import type { PerformRuleInstallationResponseBody } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { PERFORM_RULE_INSTALLATION_URL } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  INITIALIZE_SECURITY_SOLUTION_URL,
  INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
  INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION,
  INITIALIZATION_FLOW_INIT_AI_PROMPTS,
} from '@kbn/security-solution-plugin/common/api/initialization';
import {
  ELASTIC_SECURITY_RULE_ID,
  PREBUILT_RULES_PACKAGE_NAME,
} from '@kbn/security-solution-plugin/common/detection_engine/constants';
import type { PrePackagedRulesStatusResponse } from '@kbn/security-solution-plugin/public/detection_engine/rule_management/logic/types';
import { getPrebuiltRuleWithExceptionsMock } from '@kbn/security-solution-plugin/server/lib/detection_engine/prebuilt_rules/mocks';
import type { createDeprecatedRuleAssetSavedObject } from '../../helpers/rules';
import { createRuleAssetSavedObject } from '../../helpers/rules';
import { IS_SERVERLESS } from '../../env_var_names_constants';
import { refreshSavedObjectIndices, rootRequest } from './common';

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

export const getInstalledPrebuiltRulesCount = () => {
  cy.log('Get installed prebuilt rules count');

  return getPrebuiltRulesStatus().then(({ body }) => body.rules_installed);
};

/**
 * Builds an ndjson bulk-index request body from an array of rule asset objects.
 * Each element must expose a `'security-rule'` key with at least `rule_id` and `version`.
 */
const buildBulkIndexBody = <T extends { 'security-rule': { rule_id: string; version: number } }>(
  index: string,
  rules: T[]
): string =>
  rules.reduce((body, rule) => {
    const documentId = `security-rule:${rule['security-rule'].rule_id}_${rule['security-rule'].version}`;
    return body.concat(
      `${JSON.stringify({ index: { _index: index, _id: documentId } })}\n${JSON.stringify(rule)}\n`
    );
  }, '');

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

  cy.task('putMapping', index);
  cy.task('bulkInsert', buildBulkIndexBody(index, rules));
};

/**
 * Flows that install Fleet packages. These are the ones we want to mock out
 * so the real packages are never pulled during e2e tests.
 */
const MOCK_PACKAGE_FLOW_RESULTS: Record<string, object> = {
  [INITIALIZATION_FLOW_INIT_PREBUILT_RULES]: {
    status: 'ready',
    payload: {
      name: 'security_detection_engine',
      version: '0.0.0',
      install_status: 'already_installed',
    },
  },
  [INITIALIZATION_FLOW_INIT_ENDPOINT_PROTECTION]: {
    status: 'ready',
    payload: { name: 'endpoint', version: '0.0.0', install_status: 'already_installed' },
  },
  [INITIALIZATION_FLOW_INIT_AI_PROMPTS]: {
    status: 'ready',
    payload: { name: 'security_ai_prompts', version: '0.0.0', install_status: 'already_installed' },
  },
};

/* Prevent the installation of Fleet packages (prebuilt rules, endpoint, AI
/* prompts) by stripping them from the initialization request and returning mock
/* results. Non-package flows (list indices, data views, etc.) are forwarded to
/* the real server so the necessary infrastructure is still created. */
export const preventPrebuiltRulesPackageInstallation = () => {
  cy.log('Prevent prebuilt rules package installation');
  cy.intercept('POST', INITIALIZE_SECURITY_SOLUTION_URL, (req) => {
    const requestedFlows: string[] = req.body?.flows ?? [];
    const mockedFlows = requestedFlows.filter((id) => id in MOCK_PACKAGE_FLOW_RESULTS);
    const serverFlows = requestedFlows.filter((id) => !(id in MOCK_PACKAGE_FLOW_RESULTS));

    if (serverFlows.length === 0) {
      // Every requested flow is mocked — reply immediately without hitting the server
      const flows: Record<string, object> = {};
      for (const id of mockedFlows) {
        flows[id] = MOCK_PACKAGE_FLOW_RESULTS[id];
      }
      req.reply({ flows });
      return;
    }

    // Forward only non-package flows to the server
    req.body.flows = serverFlows;
    req.continue((res) => {
      // Merge mock package results into the real server response
      for (const id of mockedFlows) {
        res.body.flows[id] = MOCK_PACKAGE_FLOW_RESULTS[id];
      }
      res.send();
    });
  });
};

const installByUploadPrebuiltRulesPackage = (packagePath: string): Cypress.Chainable => {
  return cy
    .fixture(packagePath, 'binary')
    .then(Cypress.Blob.binaryStringToBlob)
    .then((blob) =>
      rootRequest({
        method: 'POST',
        url: '/api/fleet/epm/packages',
        headers: {
          'Content-Type': 'application/zip',
          'elastic-api-version': '2023-10-31',
          'kbn-xsrf': 'xxxx',
        },
        body: blob,
        encoding: 'binary',
        timeout: 120000, // 2 minutes for slow package installation in CI
      })
    )
    .then(() => {
      if (!Cypress.env(IS_SERVERLESS)) {
        refreshSavedObjectIndices();
      }
    });
};

/**
 * Installs a prepared mock prebuilt rules package `security_detection_engine`.
 * Installing it up front prevents installing the real package when making API requests.
 */
export const installMockPrebuiltRulesPackage = (): Cypress.Chainable => {
  cy.log('Install mock prebuilt rules package');

  return installByUploadPrebuiltRulesPackage(
    'security_detection_engine_packages/mock-security_detection_engine-99.0.0.zip'
  );
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

const MAX_DELETE_FLEET_PACKAGE_RETRIES = 2;
const DELETE_FLEET_PACKAGE_DELAY_MS = 5000;

const deleteFleetPackage = (
  packageName: string,
  retries = MAX_DELETE_FLEET_PACKAGE_RETRIES,
  delayMs = DELETE_FLEET_PACKAGE_DELAY_MS
): Cypress.Chainable<Cypress.Response<unknown>> => {
  const deleteWithRetries = (tried = 0): Cypress.Chainable<Cypress.Response<unknown>> => {
    if (tried > retries) {
      throw new Error(`Error deleting ${packageName} package`);
    }

    return rootRequest({
      method: 'DELETE',
      url: epmRouteService.getRemovePath(packageName),
      body: JSON.stringify({ force: true }),
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 200) {
        cy.log(`Deleted ${packageName} package (was installed)`);
        return;
      } else if (
        response.status === 400 &&
        (response.body as { message?: string }).message === `${packageName} is not installed`
      ) {
        cy.log(`Deleted ${packageName} package (was not installed)`, response.body);
        return;
      } else {
        cy.log(`Error deleting ${packageName} package`, response.body);
        cy.wait(delayMs).then(() => deleteWithRetries(tried + 1));
      }

      if (!Cypress.env(IS_SERVERLESS)) {
        refreshSavedObjectIndices();
      }
    });
  };

  return deleteWithRetries();
};

export const deletePrebuiltRulesFleetPackage = (): Cypress.Chainable<Cypress.Response<unknown>> =>
  deleteFleetPackage(PREBUILT_RULES_PACKAGE_NAME);

/**
 * Bulk create deprecated rule asset saved objects in ES.
 * These are minimal stubs with `deprecated: true` that signal a rule has been deprecated.
 * Use `createDeprecatedRuleAssetSavedObject()` to build each rule asset.
 *
 * Use in combination with `preventPrebuiltRulesPackageInstallation` so that only
 * the mocked assets are present during the test.
 */
export const createDeprecatedRuleAssets = ({
  index = '.kibana_security_solution',
  rules,
}: {
  index?: string;
  rules: Array<ReturnType<typeof createDeprecatedRuleAssetSavedObject>>;
}) => {
  cy.log(
    'Bulk create deprecated rule assets',
    rules.map((rule) => rule['security-rule'].rule_id).join(', ')
  );

  cy.task('putMapping', index);
  cy.task('bulkInsert', buildBulkIndexBody(index, rules));
};
