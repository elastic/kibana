/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RuntimePinResult } from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';
import {
  FLEET_AGENT_POLICIES_ALL_PRIVILEGE,
  NATIVE_VULN_SCANNER_API_VERSION,
  ONBOARDING_RUNTIME_PIN_PATH,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/constants';
import { planPolicies } from '../lib/onboarding';
import { policyIdsBodySchema } from './policy_ids_schema';
import { fleetUnavailable, respondWithError } from './route_error';
import type { RouteDependencies } from './types';
import { withLicense } from './with_license';

export type {
  RuntimePinOutcome,
  RuntimePinResult,
} from '@kbn/cloud-security-posture-common/native_vuln_scanner/types';

export const registerOnboardingRuntimePinRoute = ({
  router,
  logger,
  getLicense,
  getServices,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: ONBOARDING_RUNTIME_PIN_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: [FLEET_AGENT_POLICIES_ALL_PRIVILEGE] } },
      summary: i18n.translate('xpack.nativeVulnScanner.routes.runtimePinSummary', {
        defaultMessage: 'Run osquerybeat as a separate process on the selected agent policies',
      }),
    })
    .addVersion(
      {
        version: NATIVE_VULN_SCANNER_API_VERSION,
        validate: { request: { body: policyIdsBodySchema } },
      },
      withLicense(getLicense, async (context, request, response) => {
        try {
          const { fleet } = await getServices();
          if (!fleet) return fleetUnavailable(response);
          const core = await context.core;
          // Request-scoped saved objects client (the write is authorised as the caller), the
          // internal ES client (as Fleet's own update handler does) and `{ user }` for the audit
          // trail. `force` is never passed, so managed policies stay untouched.
          const soClient = core.savedObjects.client;
          // Origin-only under CPS: Fleet's policy update reads and writes the project this Kibana runs in.
          const esClient = core.elasticsearch.client.asInternalUser;
          const user = core.security.authc.getCurrentUser() ?? undefined;
          const { policies, plans } = await planPolicies(
            fleet.agentPolicyService,
            soClient,
            (request.body as { policyIds: string[] }).policyIds
          );
          const byId = new Map(policies.map((policy) => [policy.id, policy]));

          const results: RuntimePinResult[] = [];
          for (const { before, after, outcome, ...plan } of plans) {
            const policy = byId.get(plan.id);
            if (outcome !== 'change' || !policy || after === undefined) {
              results.push({
                ...plan,
                outcome:
                  outcome === 'change' ? 'failed' : outcome === 'no_change' ? 'no_change' : outcome,
              });
              continue;
            }
            try {
              await fleet.agentPolicyService.update(
                soClient,
                esClient,
                plan.id,
                { advanced_settings: { ...policy.advanced_settings, agent_internal: after } },
                { user }
              );
              results.push({ ...plan, outcome: 'updated' });
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              logger.warn(`Failed to pin the osquerybeat runtime on policy ${plan.id}: ${message}`);
              results.push({ ...plan, outcome: 'failed', message });
            }
          }
          return response.ok({ body: { results } });
        } catch (error) {
          return respondWithError(error, response, logger);
        }
      })
    );
};
