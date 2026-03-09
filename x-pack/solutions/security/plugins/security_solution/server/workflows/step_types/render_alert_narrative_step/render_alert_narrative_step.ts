/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import type { AlertSource } from './narrative_utils';
import { buildNarrative } from './narrative_registry';

const inputSchema = z.object({
  alertId: z.string().describe('The alert ID'),
  alertIndex: z.string().describe('The index that contains the alert'),
});

const outputSchema = z.object({
  alert_id: z.string(),
  alert_index: z.string(),
  timeline_string: z.string(),
  message: z.string(),
});

const SOURCE_INCLUDES = [
  // Core event fields
  'event.category',
  'event.action',
  'event.outcome',
  'event.dataset',
  'event.module',

  // Process fields
  'process.name',
  'process.pid',
  'process.args',
  'process.title',
  'process.working_directory',
  'process.exit_code',
  'process.ppid',
  'process.executable',
  'process.hash.sha256',
  'process.parent.name',
  'process.parent.pid',

  // File fields
  'file.name',
  'file.path',
  'file.hash.sha256',
  'file.extension',
  'file.size',

  // Network fields
  'source.ip',
  'source.port',
  'destination.ip',
  'destination.port',
  'network.protocol',
  'network.transport',
  'network.direction',
  'network.bytes',

  // DNS fields
  'dns.question.name',
  'dns.question.type',
  'dns.resolved_ip',
  'dns.response_code',

  // Authentication fields
  'source.as.organization.name',

  // Registry fields (Windows)
  'registry.key',
  'registry.path',
  'registry.data.strings',
  'registry.value',

  // Cloud fields
  'cloud.provider',
  'cloud.account.id',
  'cloud.region',
  'cloud.service.name',
  'aws.cloudtrail.user_identity.arn',
  'aws.cloudtrail.user_identity.type',
  'aws.cloudtrail.event_type',
  'aws.cloudtrail.error_code',
  'aws.cloudtrail.request_parameters',
  'azure.auditlogs.properties.initiated_by.user.user_principal_name',
  'azure.activitylogs.identity.claims_initiated_by_user.name',
  'gcp.audit.authentication_info.principal_email',
  'gcp.audit.method_name',
  'gcp.audit.resource_name',

  // Threat indicator fields
  'threat.indicator.matched.atomic',
  'threat.indicator.matched.type',
  'threat.indicator.matched.field',
  'threat.indicator.provider',
  'threat.feed.name',

  // Identity fields
  'user.name',
  'user.domain',
  'user.id',
  'host.name',
  'host.id',
  'host.os.name',

  // Alert metadata
  'kibana.alert.severity',
  'kibana.alert.rule.name',
  'kibana.alert.rule.type',

  'message',
] as const;

const getAlertSource = async ({
  esClient,
  alertIndex,
  alertId,
}: {
  esClient: ElasticsearchClient;
  alertIndex: string;
  alertId: string;
}): Promise<AlertSource> => {
  const response = await esClient.get<AlertSource>({
    index: alertIndex,
    id: alertId,
    _source_includes: [...SOURCE_INCLUDES],
  });

  return response._source ?? {};
};

export const renderAlertNarrativeStepDefinition = createServerStepDefinition({
  id: 'security.renderAlertNarrative',
  inputSchema,
  outputSchema,
  handler: async (context) => {
    try {
      const { alertId, alertIndex } = context.input;
      const esClient = context.contextManager.getScopedEsClient();

      const source = await getAlertSource({ esClient, alertId, alertIndex });
      const timelineString = buildNarrative(source);

      return {
        output: {
          alert_id: alertId,
          alert_index: alertIndex,
          timeline_string: timelineString,
          message: `Generated a Timeline-like string for alert ${alertId}.`,
        },
      };
    } catch (error) {
      context.logger.error('Failed to generate alert timeline string', error);
      return {
        error: new Error(
          error instanceof Error ? error.message : 'Failed to generate alert timeline string'
        ),
      };
    }
  },
});
