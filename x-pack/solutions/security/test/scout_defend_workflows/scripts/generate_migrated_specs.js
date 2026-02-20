#!/usr/bin/env node
/**
 * Generates Scout spec files for each Cypress .cy.ts file (migrated as skipped placeholders).
 * Run from repo root: node x-pack/solutions/security/test/scout_defend_workflows/scripts/generate_migrated_specs.js
 */
const fs = require('fs');
const path = require('path');

const CYPRESS_E2E =
  'x-pack/solutions/security/plugins/security_solution/public/management/cypress/e2e';
const SCOUT_PARALLEL = 'x-pack/solutions/security/test/scout_defend_workflows/ui/parallel_tests';

const COPYRIGHT = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */`;

function toScoutPath(cyPath) {
  return cyPath.replace(/\.cy\.ts$/, '.spec.ts').replace(/\.no_ff\.cy\.ts$/, '.no_ff.spec.ts');
}

function toDescribeName(relativePath) {
  const name = path.basename(relativePath, path.extname(relativePath));
  return name.replace(/\./g, ' ').replace(/_/g, ' ');
}

const cypressSpecs = [
  'artifacts/artifacts.cy.ts',
  'artifacts/artifact_tabs_in_policy_details.cy.ts',
  'artifacts/blocklist.cy.ts',
  'artifacts/blocklist_rbac.cy.ts',
  'artifacts/endpoint_exceptions.cy.ts',
  'artifacts/endpoint_exceptions.no_ff.cy.ts',
  'artifacts/endpoint_exceptions_rbac.cy.ts',
  'artifacts/event_filters.cy.ts',
  'artifacts/event_filters_rbac.cy.ts',
  'artifacts/host_isolation_exceptions_rbac.cy.ts',
  'artifacts/trusted_apps.cy.ts',
  'artifacts/trusted_apps_rbac.cy.ts',
  'artifacts/trusted_devices.cy.ts',
  'artifacts/trusted_devices_rbac.cy.ts',
  'automated_response_actions/automated_response_actions.cy.ts',
  'automated_response_actions/form.cy.ts',
  'automated_response_actions/history_log.cy.ts',
  'automated_response_actions/no_license.cy.ts',
  'automated_response_actions/results.cy.ts',
  'endpoint_details/insights.cy.ts',
  'endpoint_list/endpoints.cy.ts',
  'endpoint_list/endpoints_mocked_data.cy.ts',
  'endpoint_list/endpoints_rbac_mocked_data_empty_state.cy.ts',
  'endpoint_list/endpoints_rbac_mocked_data_hosts_exist.cy.ts',
  'endpoint_list/endpoints_rbac_mocked_data_policies_exist.cy.ts',
  'endpoint_list/policy_response.cy.ts',
  'endpoint_alerts.cy.ts',
  'policy/policy_details.cy.ts',
  'policy/policy_details_mocked_data.cy.ts',
  'policy/policy_experimental_features_disabled.cy.ts',
  'policy/policy_list.cy.ts',
  'rbac/endpoint_role_rbac.cy.ts',
  'rbac/endpoint_role_rbac_with_space_awareness.cy.ts',
  'rbac/navigation.cy.ts',
  'response_actions/alerts_response_console.cy.ts',
  'response_actions/document_signing.cy.ts',
  'response_actions/endpoints_list_response_console.cy.ts',
  'response_actions/isolate.cy.ts',
  'response_actions/isolate_mocked_data.cy.ts',
  'response_actions/responder.cy.ts',
  'response_actions/response_actions_history.cy.ts',
  'response_actions/response_console/execute.cy.ts',
  'response_actions/response_console/file_operations.cy.ts',
  'response_actions/response_console/isolate.cy.ts',
  'response_actions/response_console/process_operations.cy.ts',
  'response_actions/response_console/release.cy.ts',
  'response_actions/response_console/scan.cy.ts',
  'response_actions/response_console_mocked/execute.cy.ts',
  'response_actions/response_console_mocked/get_file.cy.ts',
  'response_actions/response_console_mocked/isolate.cy.ts',
  'response_actions/response_console_mocked/kill_process.cy.ts',
  'response_actions/response_console_mocked/processes.cy.ts',
  'response_actions/response_console_mocked/release.cy.ts',
  'response_actions/response_console_mocked/suspend_process.cy.ts',
  'serverless/endpoint_list_with_security_essentials.cy.ts',
  'serverless/feature_access/complete.cy.ts',
  'serverless/feature_access/complete_with_endpoint.cy.ts',
  'serverless/feature_access/essentials.cy.ts',
  'serverless/feature_access/essentials_with_endpoint.cy.ts',
  'serverless/feature_access/api/agent_policy_settings_complete.cy.ts',
  'serverless/feature_access/api/agent_policy_settings_essentials.cy.ts',
  'serverless/feature_access/api/workflow_insights_complete.cy.ts',
  'serverless/feature_access/api/workflow_insights_essentials.cy.ts',
  'serverless/feature_access/components/agent_policy_settings_complete.cy.ts',
  'serverless/feature_access/components/agent_policy_settings_essentials.cy.ts',
  'serverless/feature_access/components/endpoint_details_complete.cy.ts',
  'serverless/feature_access/components/endpoint_details_essentials.cy.ts',
  'serverless/feature_access/components/policy_details_endpoint_complete.cy.ts',
  'serverless/feature_access/components/policy_details_endpoint_essentials.cy.ts',
  'serverless/metering.cy.ts',
  'serverless/policy_details_with_security_essentials.cy.ts',
  'serverless/roles/complete_with_endpoint_roles.cy.ts',
  'serverless/roles/essentials_with_endpoint.roles.cy.ts',
  'sentinelone/isolate.cy.ts',
  'tamper_protection/disabled/unenroll_agent_from_fleet.cy.ts',
  'tamper_protection/disabled/uninstall_agent_from_host.cy.ts',
  'tamper_protection/enabled/unenroll_agent_from_fleet.cy.ts',
  'tamper_protection/enabled/uninstall_agent_from_host.cy.ts',
  'tamper_protection/switching_policies/unenroll_agent_from_fleet_changing_policy_from_disabled_to_enabled.cy.ts',
  'tamper_protection/switching_policies/unenroll_agent_from_fleet_changing_policy_from_enabled_to_disabled.cy.ts',
  'tamper_protection/switching_policies/unenroll_agent_from_fleet_changing_policy_from_enabled_to_enabled.cy.ts',
  'tamper_protection/switching_policies/uninstall_agent_from_host_changing_policy_from_disabled_to_enabled.cy.ts',
  'tamper_protection/switching_policies/uninstall_agent_from_host_changing_policy_from_enabled_to_disabled.cy.ts',
  'tamper_protection/switching_policies/uninstall_agent_from_host_changing_policy_from_enabled_to_enabled.cy.ts',
];

function specContent(relativePath, describeName) {
  const skipReason = 'Migrated from Cypress; requires Fleet/Endpoint setup or API data loaders.';
  return `${COPYRIGHT}

import { spaceTest, tags } from '@kbn/scout-security';

spaceTest.describe(
  'Defend Workflows - ${describeName}',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    spaceTest.skip('${describeName} (Cypress migration placeholder)', async () => {
      // ${skipReason}
    });
  }
);
`;
}

cypressSpecs.forEach((rel) => {
  const scoutRel = toScoutPath(rel);
  const outPath = path.join(process.cwd(), SCOUT_PARALLEL, scoutRel);
  const dir = path.dirname(outPath);
  const describeName = toDescribeName(rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, specContent(rel, describeName), 'utf8');
  console.log('Wrote', outPath);
});

console.log('Done. Generated', cypressSpecs.length, 'spec files.');
