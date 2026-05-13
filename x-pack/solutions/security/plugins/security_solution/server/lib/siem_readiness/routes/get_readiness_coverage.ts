/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { GET_SIEM_READINESS_COVERAGE_API_PATH } from '../../../../common/api/siem_readiness/constants';
import { API_VERSIONS } from '../../../../common/constants';
import type { SiemReadinessRoutesDeps } from '../types';
import { fetchCategories } from '../fetch_categories';
import { compileCoverageData } from '../compile_coverage';
import type { CoverageRuleInput } from '../compile_coverage';

/** Security detection rule type IDs (alerting framework identifiers). */
const SECURITY_RULE_TYPE_IDS = [
  'siem.queryRule',
  'siem.eqlRule',
  'siem.esqlRule',
  'siem.mlRule',
  'siem.savedQueryRule',
  'siem.thresholdRule',
  'siem.newTermsRule',
] as const;

interface DetectionRuleParams {
  related_integrations?: Array<{ package: string; version?: string; integration?: string }>;
  threat?: Array<{ tactic?: { name?: string } }>;
}

export const getReadinessCoverageRoute = (
  router: SiemReadinessRoutesDeps['router'],
  logger: SiemReadinessRoutesDeps['logger'],
  getStartServices: SiemReadinessRoutesDeps['getStartServices']
) => {
  router.versioned
    .get({
      path: GET_SIEM_READINESS_COVERAGE_API_PATH,
      access: 'public',
      security: { authz: { requiredPrivileges: ['securitySolution'] } },
    })
    .addVersion(
      { version: API_VERSIONS.public.v1, validate: {} },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const [, startPlugins] = await getStartServices();
          const { elasticsearch } = await context.core;
          const esClient = elasticsearch.client.asCurrentUser;

          const [categoriesData, rulesResult] = await Promise.all([
            fetchCategories(esClient),
            startPlugins.alerting.getRulesClientWithRequest(request).then((client) =>
              client.find({
                options: {
                  ruleTypeIds: [...SECURITY_RULE_TYPE_IDS],
                  filter: 'alert.attributes.enabled:true',
                  perPage: 10000,
                  fields: ['params', 'enabled'],
                },
              })
            ),
          ]);

          const installedPackageNames: string[] = [];
          try {
            const packages =
              (await startPlugins.fleet?.packageService
                .asScoped(request)
                .getInstalledPackages({ perPage: 10000, sortOrder: 'asc' })) ?? {};
            const items = (packages as { items?: Array<{ name: string }> }).items ?? [];
            items.forEach(({ name }) => installedPackageNames.push(name));
          } catch (fleetError) {
            logger.warn(`SIEM Readiness coverage: could not fetch Fleet packages: ${fleetError}`);
          }

          const rules: CoverageRuleInput[] = rulesResult.data.map((r) => ({
            related_integrations: (r.params as DetectionRuleParams).related_integrations,
            threat: (r.params as DetectionRuleParams).threat,
          }));

          const compiledData = compileCoverageData(categoriesData, rules, installedPackageNames);

          logger.info(
            `Retrieved coverage data: ${compiledData.summary.activeCategories.length} active categories, ${rulesResult.data.length} enabled rules, ${installedPackageNames.length} installed integrations`
          );
          return response.ok({ body: compiledData });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error retrieving SIEM readiness coverage data: ${error.message}`);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
};
