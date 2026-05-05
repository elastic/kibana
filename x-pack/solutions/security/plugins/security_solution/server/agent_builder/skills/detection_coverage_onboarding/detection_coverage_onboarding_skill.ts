/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { ToolType } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { z } from '@kbn/zod/v4';
import { GET_INSTALLED_INTEGRATIONS_URL } from '../../../../common/api/detection_engine/fleet_integrations';
import {
  GET_PREBUILT_RULES_STATUS_URL,
  REVIEW_RULE_INSTALLATION_URL,
  PERFORM_RULE_INSTALLATION_URL,
} from '../../../../common/api/detection_engine/prebuilt_rules/urls';
import {
  DEFAULT_ALERTS_INDEX,
  DETECTION_ENGINE_RULES_URL_FIND,
} from '../../../../common/constants';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';

interface InstalledIntegration {
  package_name: string;
  package_title: string;
  package_version: string;
  integration_name?: string;
  integration_title?: string;
  is_enabled: boolean;
}

interface RelatedIntegration {
  package: string;
  version: string;
  integration?: string;
}

interface ReviewRuleResult {
  rule_id: string;
  version: number;
  name: string;
  description: string;
  severity: string;
  risk_score: number;
  tags: string[];
  related_integrations: RelatedIntegration[];
  type: string;
}

const buildFetchHeaders = (request: KibanaRequest): Record<string, string> => {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'kbn-xsrf': 'true',
    'x-elastic-internal-origin': 'kibana',
    'elastic-api-version': '1',
  };
  const rawHeaders = request.headers;
  if (rawHeaders.authorization) {
    headers.authorization = String(rawHeaders.authorization);
  }
  if (rawHeaders.cookie) {
    headers.cookie = String(rawHeaders.cookie);
  }
  return headers;
};

const fetchKibanaApi = async <T>({
  baseUrl,
  path,
  method = 'GET',
  body,
  headers,
}: {
  baseUrl: string;
  path: string;
  method?: string;
  body?: Record<string, unknown>;
  headers: Record<string, string>;
}): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Kibana API ${method} ${path} returned ${response.status}: ${errorText}`);
  }

  return (await response.json()) as T;
};

export const createDetectionCoverageOnboardingSkill = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
) =>
  defineSkillType({
    id: 'detection-coverage-onboarding',
    name: 'detection-coverage-onboarding',
    basePath: 'skills/security/rules',
    description:
      'Analyze installed Fleet integrations, find matching prebuilt detection rules, and install them. ' +
      'Helps new customers onboard detection coverage by recommending appropriate rules for their data sources.',
    content: `# Detection Coverage Onboarding

## When to Use This Skill

Use this skill when:
- A user wants to know which detection rules to enable for their data
- New Fleet integrations have been installed and matching rules should be activated
- A user asks about detection coverage gaps or wants rule recommendations
- A user is onboarding to Elastic Security and needs help setting up detection rules

## Workflow

### Step 1: Assess Current State
Use 'security.detection-coverage.get-rules-status' to check how many prebuilt rules are installed vs available.
This gives you the big picture before diving into specifics.

### Step 2: List Installed Integrations
Use 'security.detection-coverage.list-installed-integrations' to discover what data sources the user has configured.
Report the list of integrations with their enabled status.

### Step 3: Find Matching Rules
Use 'security.detection-coverage.find-matching-rules' to discover which available prebuilt rules match the installed integrations.
The tool matches rules by their related_integrations metadata against installed Fleet packages.

Present the findings clearly:
- Total matching rules available for installation
- Breakdown by integration (e.g., "Okta: 47 rules, AWS CloudTrail: 23 rules")
- Breakdown by severity (critical, high, medium, low)

### Step 4: Install Critical Severity Rules
The find-matching-rules tool only returns critical severity rules in 'rules_to_install'.
These cover the most impactful threats while avoiding alert fatigue.
High, medium, and low severity rules are reported in the summary but not included for installation.

Use 'security.detection-coverage.install-rules' to install the rules from 'rules_to_install.critical'.
Report the installation results: how many succeeded, skipped, or failed.

### Step 5: Monitor Rule Health
After installing rules, use 'security.detection-coverage.check-rule-health' to verify rules are working:
- Check for failing rules (execution errors)
- Check for noisy rules (>100 alerts in 24 hours)
- Check for warnings (execution gaps, missing indices)

If problems are found:
- Report which rules are problematic and why
- Suggest disabling noisy rules or investigating failures
- For noisy rules, consider adding exceptions or adjusting the rule query

### Step 6: Summary
Provide a clear summary of what was done:
- Which integrations were detected
- How many rules were installed and at what severity levels
- Health status of installed rules
- Any rules that failed to install or are problematic
- Suggestions for next steps (monitor for false positives, review rule tuning)

## Best Practices
- Always check the current state before making changes
- Present findings before taking action — let the user confirm
- Start with critical/high severity rules to avoid alert fatigue
- If no integrations are installed, suggest the user install integrations first via Fleet
- If no matching rules are found, explain that the prebuilt rules package may need to be bootstrapped first
- After installation, always check rule health to catch issues early`,
    getInlineTools: () => [
      {
        id: 'security.detection-coverage.get-rules-status',
        type: ToolType.builtin,
        description:
          'Get the current status of prebuilt detection rules: how many are installed, ' +
          'how many are available for installation, and how many can be upgraded.',
        schema: z.object({}),
        handler: async (_params, context) => {
          try {
            const [coreStart] = await core.getStartServices();
            const { protocol, hostname, port } = coreStart.http.getServerInfo();
            const basePath = coreStart.http.basePath.serverBasePath;
            const baseUrl = `${protocol}://${hostname}:${port}${basePath}`;
            const headers = buildFetchHeaders(context.request);

            const status = await fetchKibanaApi<{
              stats: {
                num_prebuilt_rules_installed: number;
                num_prebuilt_rules_to_install: number;
                num_prebuilt_rules_to_upgrade: number;
                num_prebuilt_rules_total_in_package: number;
              };
            }>({
              baseUrl,
              path: GET_PREBUILT_RULES_STATUS_URL,
              headers,
            });

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    installed: status.stats.num_prebuilt_rules_installed,
                    available_to_install: status.stats.num_prebuilt_rules_to_install,
                    available_to_upgrade: status.stats.num_prebuilt_rules_to_upgrade,
                    total_in_package: status.stats.num_prebuilt_rules_total_in_package,
                    summary:
                      status.stats.num_prebuilt_rules_total_in_package === 0
                        ? 'No prebuilt rules package found. The rules package may need to be bootstrapped first.'
                        : `${status.stats.num_prebuilt_rules_installed} rules installed out of ${status.stats.num_prebuilt_rules_total_in_package} total. ${status.stats.num_prebuilt_rules_to_install} available for installation, ${status.stats.num_prebuilt_rules_to_upgrade} available for upgrade.`,
                  },
                },
              ],
            };
          } catch (error) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to get prebuilt rules status: ${
                      error instanceof Error ? error.message : String(error)
                    }`,
                  },
                },
              ],
            };
          }
        },
      },
      {
        id: 'security.detection-coverage.list-installed-integrations',
        type: ToolType.builtin,
        description:
          'List all Fleet integrations currently installed in the system. ' +
          'Returns integration package names, titles, and whether they are enabled.',
        schema: z.object({}),
        handler: async (_params, context) => {
          try {
            const [coreStart] = await core.getStartServices();
            const { protocol, hostname, port } = coreStart.http.getServerInfo();
            const basePath = coreStart.http.basePath.serverBasePath;
            const baseUrl = `${protocol}://${hostname}:${port}${basePath}`;
            const headers = buildFetchHeaders(context.request);

            const response = await fetchKibanaApi<{
              installed_integrations: InstalledIntegration[];
            }>({
              baseUrl,
              path: GET_INSTALLED_INTEGRATIONS_URL,
              headers,
            });

            const integrations = response.installed_integrations;

            // Deduplicate by package name to get unique packages
            const uniquePackages = new Map<
              string,
              { package_name: string; package_title: string; integrations: string[]; is_enabled: boolean }
            >();
            for (const integration of integrations) {
              const existing = uniquePackages.get(integration.package_name);
              if (existing) {
                if (integration.integration_title) {
                  existing.integrations.push(integration.integration_title);
                }
                if (integration.is_enabled) {
                  existing.is_enabled = true;
                }
              } else {
                uniquePackages.set(integration.package_name, {
                  package_name: integration.package_name,
                  package_title: integration.package_title,
                  integrations: integration.integration_title
                    ? [integration.integration_title]
                    : [],
                  is_enabled: integration.is_enabled,
                });
              }
            }

            const packages = Array.from(uniquePackages.values());

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    total_integrations: integrations.length,
                    total_packages: packages.length,
                    packages,
                    raw_integrations: integrations,
                    summary:
                      integrations.length === 0
                        ? 'No Fleet integrations are currently installed. The user should install integrations via Fleet to get detection rule recommendations.'
                        : `Found ${packages.length} installed package(s) with ${integrations.length} integration(s) total.`,
                  },
                },
              ],
            };
          } catch (error) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to list installed integrations: ${
                      error instanceof Error ? error.message : String(error)
                    }`,
                  },
                },
              ],
            };
          }
        },
      },
      {
        id: 'security.detection-coverage.find-matching-rules',
        type: ToolType.builtin,
        description:
          'Find prebuilt detection rules that match installed Fleet integrations. ' +
          'Returns available (not yet installed) rules grouped by integration and severity. ' +
          'Optionally filter by specific integration package names.',
        schema: z.object({
          integrations: z
            .array(z.string())
            .optional()
            .describe(
              'Optional list of integration package names to filter by (e.g., ["okta", "aws"]). ' +
                'If not provided, matches against all installed integrations.'
            ),
        }),
        handler: async (params, context) => {
          try {
            const filterIntegrations = (params as { integrations?: string[] }).integrations;
            const [coreStart] = await core.getStartServices();
            const { protocol, hostname, port } = coreStart.http.getServerInfo();
            const basePath = coreStart.http.basePath.serverBasePath;
            const baseUrl = `${protocol}://${hostname}:${port}${basePath}`;
            const headers = buildFetchHeaders(context.request);

            // Step 1: Get installed integrations if no filter provided
            let targetPackages: Set<string>;
            if (filterIntegrations && filterIntegrations.length > 0) {
              targetPackages = new Set(filterIntegrations);
            } else {
              const integrationsResponse = await fetchKibanaApi<{
                installed_integrations: InstalledIntegration[];
              }>({
                baseUrl,
                path: GET_INSTALLED_INTEGRATIONS_URL,
                headers,
              });

              targetPackages = new Set(
                integrationsResponse.installed_integrations.map((i) => i.package_name)
              );

              if (targetPackages.size === 0) {
                return {
                  results: [
                    {
                      type: ToolResultType.other,
                      data: {
                        total_matching: 0,
                        summary:
                          'No installed integrations found. Install Fleet integrations first to get rule recommendations.',
                      },
                    },
                  ],
                };
              }
            }

            // Step 2: Get all available (not yet installed) prebuilt rules
            const reviewResponse = await fetchKibanaApi<{
              rules: ReviewRuleResult[];
              total: number;
              stats: { num_rules_to_install: number; tags: string[] };
            }>({
              baseUrl,
              path: REVIEW_RULE_INSTALLATION_URL,
              method: 'POST',
              body: { page: 1, per_page: 10000 },
              headers,
            });

            // Step 3: Filter rules by matching related_integrations
            const matchingRules = reviewResponse.rules.filter((rule) =>
              (rule.related_integrations ?? []).some((ri) => targetPackages.has(ri.package))
            );

            // Step 4: Group by integration (counts only, not full rule lists)
            const byIntegration: Record<
              string,
              { count: number; severity: { critical: number; high: number; medium: number; low: number } }
            > = {};
            for (const rule of matchingRules) {
              for (const ri of rule.related_integrations ?? []) {
                if (targetPackages.has(ri.package)) {
                  if (!byIntegration[ri.package]) {
                    byIntegration[ri.package] = {
                      count: 0,
                      severity: { critical: 0, high: 0, medium: 0, low: 0 },
                    };
                  }
                  byIntegration[ri.package].count += 1;
                  const sev = rule.severity as keyof typeof byIntegration[string]['severity'];
                  if (sev in byIntegration[ri.package].severity) {
                    byIntegration[ri.package].severity[sev] += 1;
                  }
                }
              }
            }

            // Step 5: Severity breakdown
            const severityBreakdown = { critical: 0, high: 0, medium: 0, low: 0 };
            for (const rule of matchingRules) {
              const sev = rule.severity as keyof typeof severityBreakdown;
              if (sev in severityBreakdown) {
                severityBreakdown[sev] += 1;
              }
            }

            // Return compact data: summary stats + rule_id/version pairs for installation
            // Only include critical severity rules to avoid alert fatigue and keep install fast
            const rulesBySeverity: Record<string, Array<{ rule_id: string; version: number }>> = {
              critical: [],
            };
            for (const rule of matchingRules) {
              const sev = rule.severity;
              if (sev in rulesBySeverity) {
                rulesBySeverity[sev].push({ rule_id: rule.rule_id, version: rule.version });
              }
            }

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    total_available_to_install: reviewResponse.total,
                    total_matching: matchingRules.length,
                    target_integrations: Array.from(targetPackages),
                    severity_breakdown: severityBreakdown,
                    by_integration: byIntegration,
                    rules_to_install: rulesBySeverity,
                    summary: `Found ${matchingRules.length} installable rules matching ${targetPackages.size} integration(s) out of ${reviewResponse.total} total available. Severity breakdown: ${severityBreakdown.critical} critical, ${severityBreakdown.high} high, ${severityBreakdown.medium} medium, ${severityBreakdown.low} low.`,
                  },
                },
              ],
            };
          } catch (error) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to find matching rules: ${
                      error instanceof Error ? error.message : String(error)
                    }`,
                  },
                },
              ],
            };
          }
        },
      },
      {
        id: 'security.detection-coverage.install-rules',
        type: ToolType.builtin,
        description:
          'Install specific prebuilt detection rules by their rule IDs. ' +
          'Each rule must be specified with its rule_id and version number.',
        schema: z.object({
          rules: z
            .array(
              z.object({
                rule_id: z.string().describe('The prebuilt rule ID (e.g., "rule-id-abc-123")'),
                version: z.number().describe('The rule version number to install'),
              })
            )
            .min(1)
            .describe('Array of rules to install, each with rule_id and version'),
        }),
        handler: async ({ rules }, context) => {
          try {
            const [coreStart] = await core.getStartServices();
            const { protocol, hostname, port } = coreStart.http.getServerInfo();
            const basePath = coreStart.http.basePath.serverBasePath;
            const baseUrl = `${protocol}://${hostname}:${port}${basePath}`;
            const headers = buildFetchHeaders(context.request);

            const installResponse = await fetchKibanaApi<{
              summary: {
                total: number;
                succeeded: number;
                skipped: number;
                failed: number;
              };
              results: {
                created: Array<{ rule_id: string; name: string; severity: string }>;
                skipped: Array<{ rule_id: string; reason: string }>;
              };
              errors: Array<{ message: string; rules: Array<{ rule_id: string }> }>;
            }>({
              baseUrl,
              path: PERFORM_RULE_INSTALLATION_URL,
              method: 'POST',
              body: {
                mode: 'SPECIFIC_RULES',
                rules,
              },
              headers,
            });

            const { summary } = installResponse;

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    summary,
                    created: installResponse.results.created.map((r) => ({
                      rule_id: r.rule_id,
                      name: r.name,
                      severity: r.severity,
                    })),
                    skipped: installResponse.results.skipped,
                    errors: installResponse.errors,
                    verdict:
                      summary.failed === 0
                        ? `Successfully installed ${summary.succeeded} rule(s). ${summary.skipped} skipped (already installed).`
                        : `Installed ${summary.succeeded} rule(s), but ${summary.failed} failed. Check errors for details.`,
                  },
                },
              ],
            };
          } catch (error) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to install rules: ${
                      error instanceof Error ? error.message : String(error)
                    }`,
                  },
                },
              ],
            };
          }
        },
      },
      {
        id: 'security.detection-coverage.check-rule-health',
        type: ToolType.builtin,
        description:
          'Check the health of installed prebuilt detection rules. ' +
          'Returns execution status (running, failed, warning) and alert counts for recently installed rules. ' +
          'Use this after installing rules to verify they are working correctly.',
        schema: z.object({
          max_rules: z
            .number()
            .min(1)
            .max(100)
            .default(20)
            .optional()
            .describe('Maximum number of rules to check (default 20, most recently installed first)'),
        }),
        handler: async (params, context) => {
          try {
            const maxRules = (params as { max_rules?: number }).max_rules ?? 20;
            const [coreStart] = await core.getStartServices();
            const { protocol, hostname, port } = coreStart.http.getServerInfo();
            const basePath = coreStart.http.basePath.serverBasePath;
            const baseUrl = `${protocol}://${hostname}:${port}${basePath}`;
            const headers = {
              ...buildFetchHeaders(context.request),
              'elastic-api-version': '2023-10-31',
            };

            // Step 1: Find installed prebuilt rules sorted by updated_at (most recent first)
            const findResponse = await fetchKibanaApi<{
              data: Array<{
                id: string;
                name: string;
                rule_id: string;
                enabled: boolean;
                severity: string;
                execution_summary?: {
                  last_execution: {
                    date: string;
                    status: string;
                    status_order: number;
                    message: string;
                    metrics: {
                      total_search_duration_ms?: number;
                      execution_gap_duration_s?: number;
                    };
                  };
                };
              }>;
              total: number;
            }>({
              baseUrl,
              path: `${DETECTION_ENGINE_RULES_URL_FIND}?filter=alert.attributes.params.immutable:true&sort_field=updatedAt&sort_order=desc&per_page=${maxRules}`,
              headers,
            });

            // Step 2: Check alert counts for each rule (last 24h)
            const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${context.spaceId}`;
            const ruleIds = findResponse.data.map((r) => r.id);

            let alertCountsByRule: Record<string, number> = {};
            if (ruleIds.length > 0) {
              const alertsQuery = await context.esClient.asCurrentUser.search({
                index: alertsIndex,
                size: 0,
                query: {
                  bool: {
                    filter: [
                      { terms: { 'kibana.alert.rule.uuid': ruleIds } },
                      { range: { '@timestamp': { gte: 'now-24h' } } },
                    ],
                  },
                },
                aggs: {
                  by_rule: {
                    terms: { field: 'kibana.alert.rule.uuid', size: maxRules },
                  },
                },
                ignore_unavailable: true,
              });

              const buckets =
                (alertsQuery.aggregations?.by_rule as { buckets?: Array<{ key: string; doc_count: number }> })
                  ?.buckets ?? [];
              alertCountsByRule = Object.fromEntries(
                buckets.map((b) => [b.key, b.doc_count])
              );
            }

            // Step 3: Build health report
            const NOISY_THRESHOLD = 100;
            const rules = findResponse.data.map((rule) => {
              const alertCount24h = alertCountsByRule[rule.id] ?? 0;
              const execStatus = rule.execution_summary?.last_execution?.status ?? 'unknown';
              const execMessage = rule.execution_summary?.last_execution?.message ?? '';
              const execGap =
                rule.execution_summary?.last_execution?.metrics?.execution_gap_duration_s;

              let health: string;
              if (execStatus === 'failed') {
                health = 'failing';
              } else if (alertCount24h > NOISY_THRESHOLD) {
                health = 'noisy';
              } else if (execStatus === 'warning' || (execGap && execGap > 300)) {
                health = 'warning';
              } else if (execStatus === 'succeeded' || execStatus === 'running') {
                health = 'healthy';
              } else {
                health = 'unknown';
              }

              return {
                id: rule.id,
                rule_id: rule.rule_id,
                name: rule.name,
                enabled: rule.enabled,
                severity: rule.severity,
                health,
                execution_status: execStatus,
                execution_message: execMessage.substring(0, 200),
                alerts_last_24h: alertCount24h,
                execution_gap_seconds: execGap,
              };
            });

            const failing = rules.filter((r) => r.health === 'failing');
            const noisy = rules.filter((r) => r.health === 'noisy');
            const warnings = rules.filter((r) => r.health === 'warning');
            const healthy = rules.filter((r) => r.health === 'healthy');

            return {
              results: [
                {
                  type: ToolResultType.other,
                  data: {
                    total_checked: rules.length,
                    total_in_system: findResponse.total,
                    summary: {
                      healthy: healthy.length,
                      failing: failing.length,
                      noisy: noisy.length,
                      warning: warnings.length,
                    },
                    failing_rules: failing,
                    noisy_rules: noisy,
                    warning_rules: warnings,
                    all_rules: rules,
                    verdict:
                      failing.length === 0 && noisy.length === 0
                        ? `All ${rules.length} checked rules are healthy. ${healthy.length} running normally.`
                        : `Issues found: ${failing.length} failing, ${noisy.length} noisy (>${NOISY_THRESHOLD} alerts/24h), ${warnings.length} warnings. Review details below.`,
                  },
                },
              ],
            };
          } catch (error) {
            return {
              results: [
                {
                  type: ToolResultType.error,
                  data: {
                    message: `Failed to check rule health: ${
                      error instanceof Error ? error.message : String(error)
                    }`,
                  },
                },
              ],
            };
          }
        },
      },
    ],
  });
