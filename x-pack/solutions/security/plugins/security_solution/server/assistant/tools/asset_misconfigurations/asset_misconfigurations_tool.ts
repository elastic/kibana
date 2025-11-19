/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import {
  getAnonymizedValue,
  getRawDataOrDefault,
  isDenied,
  transformRawData,
} from '@kbn/elastic-assistant-common';
import { requestHasRequiredAnonymizationParams } from '@kbn/elastic-assistant-plugin/server/lib/langchain/helpers';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { Require } from '@kbn/elastic-assistant-plugin/server/types';
import type { CspFinding } from '@kbn/cloud-security-posture-common/types/findings';
import { APP_UI_ID } from '../../../../common';
import { getAssetMisconfigurationsQuery } from './get_asset_misconfigurations_query';

export type AssetMisconfigurationsToolParams = Require<AssistantToolParams, 'anonymizationFields'>;

export const ASSET_MISCONFIGURATIONS_TOOL_DESCRIPTION =
  "Call this to retrieve security misconfigurations and compliance violations for a specific cloud asset. The resource_id must be the full cloud resource identifier (e.g., AWS ARN like 'arn:aws:ec2:region:account:resource-type/resource-id', Azure resource path, or GCP resource name). This returns failed findings including rule details, benchmark information, and compliance impact.";

export const ASSET_MISCONFIGURATIONS_TOOL: AssistantTool = {
  id: 'asset-misconfigurations-tool',
  name: 'AssetMisconfigurationsTool',
  // note: this description is overwritten when `getTool` is called
  // local definitions exist ../elastic_assistant/server/lib/prompt/tool_prompts.ts
  // local definitions can be overwritten by security-ai-prompt integration definitions
  description: ASSET_MISCONFIGURATIONS_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is AssetMisconfigurationsToolParams => {
    const { anonymizationFields, request } = params;
    return requestHasRequiredAnonymizationParams(request) && anonymizationFields != null;
  },
  async getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;
    const { anonymizationFields, esClient, onNewReplacements, replacements } =
      params as AssetMisconfigurationsToolParams;

    return tool(
      async (input) => {
        if (isDenied({ anonymizationFields, field: 'resource.id' })) {
          return 'The field resource.id is denied by the anonymization settings and cannot be used to query misconfigurations. Please modify the anonymization settings and try again.';
        }

        const query = getAssetMisconfigurationsQuery({
          anonymizationFields: anonymizationFields ?? [],
          resourceId: input.resource_id,
        });
        const result = await esClient.search<CspFinding>(query);

        const findings =
          result.hits?.hits?.map((hit) => {
            const transformed = transformRawData({
              anonymizationFields,
              currentReplacements: replacements ?? {},
              getAnonymizedValue,
              onNewReplacements,
              rawData: getRawDataOrDefault(hit.fields),
            });
            return transformed;
          }) || [];

        return JSON.stringify({
          resource_id: input.resource_id,
          findings_count: findings.length,
          findings,
        });
      },
      {
        name: 'AssetMisconfigurationsTool',
        description: params.description || ASSET_MISCONFIGURATIONS_TOOL_DESCRIPTION,
        schema: z.object({
          resource_id: z
            .string()
            .min(1)
            .describe(
              'The full cloud resource identifier (ARN, Azure Resource ID, or GCP Resource Name) of the asset. Examples: "arn:aws:ec2:us-east-1:123456789:security-group/sg-abc123", "/subscriptions/xxx/resourceGroups/xxx/providers/Microsoft.Compute/virtualMachines/vm-name". Use entity.id field from entity data, NOT Elasticsearch document IDs or UUIDs.'
            ),
        }),
        tags: ['asset-misconfigurations', 'compliance'],
      }
    );
  },
};
