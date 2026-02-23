/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { catchAxiosErrorFormatAndThrow } from '../../../common/endpoint/format_axios_error';
import { prefixedOutputLogger } from '../common/utils';
import { fetchActiveSpace } from '../common/spaces';

/**
 * Creates or finds a VirusTotal connector
 */
const getOrCreateVirusTotalConnector = async (
    kbnClient: KbnClient,
    log: ToolingLog,
    apiKey: string
): Promise<string> => {
    const logger = prefixedOutputLogger('getOrCreateVirusTotalConnector()', log);
    const connectorName = 'RSA 2026 Demo - VirusTotal';

    logger.info('Checking for existing VirusTotal connector');

    // List connectors
    const connectorsResponse = await kbnClient
        .request({
            method: 'GET',
            path: '/api/actions/connectors',
            headers: { 'elastic-api-version': '2023-10-31' },
        })
        .catch(catchAxiosErrorFormatAndThrow)
        .then((response) => response.data);

    const connectors: Array<{ id: string; name: string; connector_type_id: string }> = Array.isArray(
        connectorsResponse
    )
        ? connectorsResponse
        : (connectorsResponse?.data ?? []);

    // Find an existing VirusTotal connector created for this demo (do not "steal" arbitrary .virustotal connectors)
    const existingConnector = connectors.find(
        (c: { id: string; name: string; connector_type_id: string }) =>
            c.connector_type_id === '.virustotal' && c.name === connectorName
    );

    if (existingConnector) {
        logger.info(`Using existing VirusTotal connector: ${existingConnector.name} (${existingConnector.id})`);
        return existingConnector.id;
    }

    // Create new VirusTotal connector
    logger.info('Creating new VirusTotal connector');
    const newConnector = await kbnClient
        .request({
            method: 'POST',
            path: '/api/actions/connector',
            headers: { 'elastic-api-version': '2023-10-31' },
            body: {
                name: connectorName,
                connector_type_id: '.virustotal',
                config: {},
                secrets: {
                    // Connector spec expects a discriminated union on `authType`
                    // See `VirusTotalConnectorSchema` in `src/platform/packages/shared/response-ops/form-generator/src/form.stories.tsx`
                    authType: 'api_key_header',
                    'x-apikey': apiKey,
                },
            },
        })
        .catch(catchAxiosErrorFormatAndThrow)
        .then((response) => response.data);

    logger.info(`VirusTotal connector created: ${newConnector.name} (${newConnector.id})`);
    return newConnector.id;
};

/**
 * Creates a VirusTotal workflow for domain lookup
 */
export const createVirusTotalWorkflow = async (
    esClient: Client,
    kbnClient: KbnClient,
    log: ToolingLog,
    apiKey: string
): Promise<{ workflowId: string; connectorId: string }> => {
    const logger = prefixedOutputLogger('createVirusTotalWorkflow()', log);

    logger.info('Creating VirusTotal workflow for RSA 2026 demo');

    return logger.indent(4, async () => {
        const workflowName = 'RSA 2026 Demo - VirusTotal Domain Check';
        const space = await fetchActiveSpace(kbnClient);

        const findExistingWorkflowIdByName = async (): Promise<string | undefined> => {
            try {
                const result = await esClient.search<{
                    name?: string;
                    spaceId?: string;
                    deleted_at?: string | null;
                    updated_at?: string;
                }>({
                    index: '.workflows-workflows',
                    size: 1,
                    sort: [{ updated_at: { order: 'desc' } }],
                    query: {
                        bool: {
                            must: [
                                { term: { spaceId: space.id } },
                                { term: { 'name.keyword': workflowName } },
                            ],
                            must_not: [{ exists: { field: 'deleted_at' } }],
                        },
                    },
                });

                const hit = result.hits.hits[0];
                return hit?._id;
            } catch (e: any) {
                // Ignore missing index / not found situations
                if (e?.statusCode === 404 || e?.meta?.statusCode === 404) return;
                logger.warning(`Failed to search workflows index for existing workflow: ${e?.message ?? e}`);
                return;
            }
        };

        const existingWorkflowId = await findExistingWorkflowIdByName();
        if (existingWorkflowId) {
            logger.info(`Workflow already exists: ${workflowName} (${existingWorkflowId})`);
            const connectorId = await getOrCreateVirusTotalConnector(kbnClient, logger, apiKey);
            return { workflowId: existingWorkflowId, connectorId };
        }

        // Get or create VirusTotal connector
        const connectorId = await getOrCreateVirusTotalConnector(kbnClient, logger, apiKey);

        // Create workflow YAML
        // IMPORTANT:
        // - Step `type` must match the workflows dynamic connector contracts: `${actionTypeIdWithoutDot}.${subAction}`
        //   So VirusTotal scanUrl is `virustotal.scanUrl` (NOT `.virustotal` and NOT `virustotal.scanUrl` without subAction mapping).
        // - Use `elasticsearch.index` to store results. Its `with` schema accepts document fields directly (body is a free-form record).
        // - The API key is stored in the connector (created above), not in the workflow YAML.
        const workflowYaml = `version: '1'
name: '${workflowName}'
description: 'Automatically check domain reputation using VirusTotal API. Stores results in ECS-compliant threat enrichment format. The VirusTotal API key is configured in the connector (${connectorId}), not in this workflow definition.'
enabled: true
tags: ['rsa-2026-demo', 'security', 'threat-intel', 'virustotal']
triggers:
  - type: manual
inputs:
  - name: domain
    type: string
    description: Domain name to check (e.g., digert.ictnsc.com)
    required: true
steps:
  - name: check_virustotal
    type: virustotal.scanUrl
    connector-id: '${connectorId}'
    with:
      url: 'https://{{inputs.domain}}'

  - name: store_results
    type: elasticsearch.index
    with:
      index: 'logs-threatintel.virustotal-default'
      '@timestamp': '{{now}}'
      threat:
        enrichments:
          - indicator:
              type: domain
              domain: '{{inputs.domain}}'
              first_seen: '{{now}}'
              last_seen: '{{now}}'
            feed:
              name: VirusTotal
            matched:
              field: destination.domain
              atomic: '{{inputs.domain}}'
              type: indicator_match_rule
            virustotal:
              analysis_id: '{{steps.check_virustotal.output.id}}'
              status: '{{steps.check_virustotal.output.status}}'
              stats: '{{steps.check_virustotal.output.stats}}'
      event:
        category: threat
        type: enrichment
      message: 'VirusTotal domain check for {{inputs.domain}}'
`;

        // Create workflow
        const workflow = await kbnClient
            .request({
                method: 'POST',
                path: '/api/workflows',
                headers: { 'elastic-api-version': '2023-10-31' },
                body: {
                    yaml: workflowYaml,
                },
            })
            .catch(catchAxiosErrorFormatAndThrow)
            .then((response) => response.data);

        logger.info(`Workflow created: ${workflow.name} (${workflow.id})`);
        logger.verbose(workflow);

        return { workflowId: workflow.id, connectorId };
    });
};

