/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { createAgentPolicy, fetchAgentPolicyList } from '../common/fleet_services';
import { addEndpointIntegrationToAgentPolicy } from '../common/fleet_services';
import { addOsqueryIntegrationToAgentPolicy } from '../osquery_host/services/add_osquery_integration';
import { prefixedOutputLogger } from '../common/utils';
import { fetchActiveSpace } from '../common/spaces';

export interface PolicySetupResult {
    defendOsquery: string;
    osqueryOnly: string;
}

/**
 * Creates two agent policies:
 * - Policy A: Elastic Defend + Osquery
 * - Policy B: Osquery only
 */
export const setupPolicies = async (
    kbnClient: KbnClient,
    log: ToolingLog
): Promise<PolicySetupResult> => {
    const logger = prefixedOutputLogger('setupPolicies()', log);

    logger.info('Creating agent policies for RSA 2026 demo');

    return logger.indent(4, async () => {
        const activeSpace = await fetchActiveSpace(kbnClient);

        const getOrCreateAgentPolicyByName = async (name: string, description: string) => {
            const existing = await fetchAgentPolicyList(kbnClient, {
                perPage: 100,
                withAgentCount: true,
                kuery: `ingest-agent-policies.name: "${name}"`,
            });

            const match = existing.items.find((p) => p.name === name);
            if (match) {
                logger.info(`Reusing existing agent policy: ${match.name} (${match.id})`);
                return match;
            }

            const created = await createAgentPolicy({
                kbnClient,
                policy: {
                    name,
                    description,
                    namespace: activeSpace.id,
                    monitoring_enabled: ['logs', 'metrics'],
                },
            });
            logger.info(`Created agent policy: ${created.name} (${created.id})`);
            return created;
        };

        // Create Policy A: Defend + Osquery
        logger.info('Creating Policy A: Elastic Defend + Osquery');
        const policyAName = 'RSA 2026 - Defend + Osquery';
        const policyA = await getOrCreateAgentPolicyByName(
            policyAName,
            'Agent policy for RSA 2026 demo with Elastic Defend and Osquery integrations'
        );

        // Add Elastic Defend integration
        logger.info('Adding Elastic Defend integration to Policy A');
        await addEndpointIntegrationToAgentPolicy({
            kbnClient,
            log: logger,
            agentPolicyId: policyA.id,
            name: `${policyA.name} - Endpoint`,
        });

        // Add Osquery integration
        logger.info('Adding Osquery integration to Policy A');
        await addOsqueryIntegrationToAgentPolicy({
            kbnClient,
            log: logger,
            agentPolicyId: policyA.id,
        });

        // Create Policy B: Osquery only
        logger.info('Creating Policy B: Osquery only');
        const policyBName = 'RSA 2026 - Osquery only';
        const policyB = await getOrCreateAgentPolicyByName(
            policyBName,
            'Agent policy for RSA 2026 demo with Osquery integration only'
        );

        // Add Osquery integration only
        logger.info('Adding Osquery integration to Policy B');
        await addOsqueryIntegrationToAgentPolicy({
            kbnClient,
            log: logger,
            agentPolicyId: policyB.id,
        });

        return {
            defendOsquery: policyA.id,
            osqueryOnly: policyB.id,
        };
    });
};

