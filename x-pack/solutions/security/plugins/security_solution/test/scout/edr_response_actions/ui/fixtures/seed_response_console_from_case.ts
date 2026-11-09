/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type {
  EsClient,
  KbnClient,
  ScoutTestConfig,
  SecurityApiServicesFixture,
} from '@kbn/scout-security';
import { EndpointDocGenerator } from '../../../../../common/endpoint/generate_data';
import {
  METADATA_DATASTREAM,
  POLICY_RESPONSE_INDEX,
} from '../../../../../common/endpoint/constants';
import {
  deleteIndexedHostsAndAlerts,
  indexHostsAndAlerts,
  type IndexedHostsAndAlertsResponse,
} from '../../../../../common/endpoint/index_data';
import {
  indexEndpointRuleAlerts,
  type IndexedEndpointRuleAlerts,
} from '../../../../../common/endpoint/data_loaders/index_endpoint_rule_alerts';
import {
  ENDPOINT_ALERTS_INDEX,
  ENDPOINT_DEVICE_INDEX,
  ENDPOINT_EVENTS_INDEX,
} from '../../../../../scripts/endpoint/common/constants';
import { createSystemIndicesEsClient } from './system_indices_es_client';
import { scopeKbnClientToSpace } from './scope_kbn_client_to_space';

export interface SeededResponseConsoleCase {
  readonly caseId: string;
  /** Saved-object id used by `comment-action-show-alert-${id}`. */
  readonly commentId: string;
  cleanup: () => Promise<void>;
}

interface AlertComment {
  id?: string;
  type?: string;
  alertId?: string | string[];
}

const alertCommentId = (comments: AlertComment[] | undefined, alertId: string): string => {
  const comment = comments?.find((item) => {
    if (item.type !== 'alert' || !item.id) {
      return false;
    }
    const ids = Array.isArray(item.alertId) ? item.alertId : [item.alertId];
    return ids.includes(alertId);
  });

  if (!comment?.id) {
    throw new Error(`Case is missing an attachment for alert ${alertId}`);
  }

  return comment.id;
};

/**
 * Indexes an enrolled endpoint host and an endpoint alert, then attaches that
 * alert to a case in the worker space. No Elastic Agent process is started.
 */
export const seedResponseConsoleFromCase = async ({
  esClient,
  kbnClient: rootKbnClient,
  spaceId,
  config,
  cases,
}: {
  esClient: EsClient;
  kbnClient: KbnClient;
  spaceId: string;
  config: ScoutTestConfig;
  cases: SecurityApiServicesFixture['cases'];
}): Promise<SeededResponseConsoleCase> => {
  const kbnClient = scopeKbnClientToSpace(rootKbnClient, spaceId);
  const systemEsClient = await createSystemIndicesEsClient(esClient, config);
  let host: IndexedHostsAndAlertsResponse | undefined;
  let alerts: IndexedEndpointRuleAlerts | undefined;
  let caseId: string | undefined;
  // Worker-space data views do not include `.alerts-security.alerts-default`.
  // `endgame-*` is in the security default index pattern, so the flyout can load this alert.
  const alertIndex = `endgame-scout-response-console-${spaceId.toLowerCase()}`;
  let alertIndexCreated = false;
  let cleanupStarted = false;

  const cleanup = async (): Promise<void> => {
    if (cleanupStarted) {
      return;
    }
    cleanupStarted = true;

    const failures: unknown[] = [];
    if (caseId) {
      try {
        await cases.delete([caseId], spaceId);
      } catch (error) {
        failures.push(error);
      }
    }

    const deletions: Array<Promise<unknown>> = [];
    if (alerts) {
      deletions.push(alerts.cleanup());
    }
    if (host) {
      deletions.push(deleteIndexedHostsAndAlerts(systemEsClient, kbnClient, host));
    }
    if (alertIndexCreated) {
      deletions.push(
        systemEsClient.indices.delete({ index: alertIndex, ignore_unavailable: true })
      );
    }

    const results = await Promise.allSettled(deletions);
    failures.push(
      ...results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []))
    );

    try {
      await systemEsClient.close();
    } catch (error) {
      failures.push(error);
    }

    const errors = failures.map((failure) =>
      failure instanceof Error ? failure : new Error(String(failure))
    );
    if (errors.length === 1) {
      throw errors[0];
    }
    if (errors.length > 1) {
      throw new AggregateError(errors, 'Failed to clean up the seeded response console case');
    }
  };

  try {
    host = await indexHostsAndAlerts(
      systemEsClient,
      kbnClient,
      `response-console-case-${randomUUID()}`,
      1,
      1,
      METADATA_DATASTREAM,
      POLICY_RESPONSE_INDEX,
      ENDPOINT_EVENTS_INDEX,
      ENDPOINT_ALERTS_INDEX,
      ENDPOINT_DEVICE_INDEX,
      0,
      true,
      {},
      EndpointDocGenerator,
      false,
      undefined,
      undefined,
      config.serverless
    );

    const agentId = host.hosts[host.hosts.length - 1]?.agent.id;
    if (!agentId) {
      throw new Error('Indexed endpoint host is missing an agent id');
    }

    await systemEsClient.indices.create({
      index: alertIndex,
      settings: {
        mapping: {
          total_fields: {
            limit: 10000,
          },
        },
      },
      // Dynamic string mapping is `text`, and the security data view sorts and
      // aggregates `host.id`. Keyword fields have doc values, so that search succeeds.
      mappings: {
        dynamic_templates: [
          {
            strings_as_keyword: {
              match_mapping_type: 'string',
              mapping: {
                type: 'keyword',
                ignore_above: 1024,
              },
            },
          },
        ],
      },
    });
    alertIndexCreated = true;

    alerts = await indexEndpointRuleAlerts({
      esClient: systemEsClient,
      kbnClient,
      endpointAgentId: agentId,
      count: 1,
      index: alertIndex,
    });
    const indexedAlert = alerts.alerts[0];
    const alertId = indexedAlert?._id;
    const indexedAlertIndex = indexedAlert?._index;
    if (!alertId || !indexedAlertIndex) {
      throw new Error('Failed to index an endpoint rule alert');
    }

    const caseTag = `response-console-${randomUUID()}`;
    const createdCase = await cases.create(
      {
        title: `Response console ${caseTag}`,
        description: 'Scout response console opened from a case',
        tags: [caseTag],
        owner: 'securitySolution',
        connector: { id: 'none', name: 'none', type: '.none', fields: null },
        settings: { syncAlerts: false, extractObservables: false },
      },
      spaceId
    );
    const createdCaseId = createdCase.data.id;
    caseId = createdCaseId;

    const withAttachment = await cases.comments.create(
      createdCaseId,
      {
        type: 'alert',
        alertId,
        index: indexedAlertIndex,
        rule: { id: null, name: 'Endpoint Security' },
        owner: 'securitySolution',
      },
      spaceId
    );

    return {
      caseId: createdCaseId,
      commentId: alertCommentId(withAttachment.data.comments, alertId),
      cleanup,
    };
  } catch (error) {
    await cleanup().catch(() => undefined);
    throw error;
  }
};
