/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { CoreStart, ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import {
  NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
  NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { InvestigatorServiceAccountStatus } from '../../../common';
import { NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER } from '../managed_workflows/constants';
import {
  getBoundInvestigationWorkflowId,
  NIGHTSHIFT_INVESTIGATOR_NAME,
  NIGHTSHIFT_INVESTIGATOR_SERVICE_ACCOUNT_ID,
} from './constants';

/** Kibana's application name in Elasticsearch application privileges (default `.kibana` index). */
const KIBANA_APPLICATION = 'kibana-.kibana';

/**
 * The investigator role. POC scope: `all` on every space (bindings are per space, so the account
 * only acts where an admin set it up) and read on observability data. Narrowing it to the feature
 * privileges the investigation actually uses is follow-up work.
 */
export const NIGHTSHIFT_INVESTIGATOR_ROLE = {
  description: 'Privileges for Nightshift investigations. Created by Nightshift.',
  cluster: ['monitor', 'monitor_inference'],
  indices: [
    {
      names: ['logs-*', 'logs', 'logs.*', 'metrics-*', 'traces-*', '.alerts-*', '.kibana_streams*'],
      privileges: ['read', 'view_index_metadata'],
      allow_restricted_indices: false,
    },
  ],
  applications: [{ application: KIBANA_APPLICATION, privileges: ['all'], resources: ['*'] }],
  metadata: { managed_by: 'nightshift' },
};

interface Deps {
  core: CoreStart;
  workflowsExtensions: WorkflowsExtensionsServerPluginStart;
  logger: Logger;
}

const isStatus = (error: unknown, status: number): boolean =>
  Boom.isBoom(error)
    ? error.output.statusCode === status
    : (error as { statusCode?: number; meta?: { statusCode?: number } })?.statusCode === status ||
      (error as { meta?: { statusCode?: number } })?.meta?.statusCode === status;

/** Creates the role when missing. An existing role is reused unchanged, never overwritten. */
const ensureRole = async (esClient: ElasticsearchClient): Promise<void> => {
  try {
    const existing = await esClient.security.getRole({ name: NIGHTSHIFT_INVESTIGATOR_NAME });
    if (existing[NIGHTSHIFT_INVESTIGATOR_NAME]) return;
  } catch (error) {
    if (!isStatus(error, 404)) throw error;
  }
  await esClient.security.putRole({
    name: NIGHTSHIFT_INVESTIGATOR_NAME,
    ...NIGHTSHIFT_INVESTIGATOR_ROLE,
  });
};

/** Creates the account when missing. A name conflict means it already exists, and is reused. */
const ensureServiceAccount = async (core: CoreStart, request: KibanaRequest): Promise<string> => {
  try {
    const created = await core.security.serviceAccounts.create(request, {
      name: NIGHTSHIFT_INVESTIGATOR_NAME,
      description: 'Runs Nightshift investigations. Created by Nightshift.',
      roles: [NIGHTSHIFT_INVESTIGATOR_NAME],
    });
    return created.id;
  } catch (error) {
    if (isStatus(error, 409)) return NIGHTSHIFT_INVESTIGATOR_SERVICE_ACCOUNT_ID;
    throw error;
  }
};

export const createInvestigatorServiceAccountService = ({
  core,
  workflowsExtensions,
  logger,
}: Deps) => {
  const getStatus = async (
    request: KibanaRequest,
    spaceId: string
  ): Promise<InvestigatorServiceAccountStatus> => {
    const client = await workflowsExtensions.getClient(request);
    const [investigation, slackThread] = await Promise.all(
      (
        [
          NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
          NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
        ] as const
      ).map((id) =>
        client.managedWorkflows.getWorkflowStatus(
          NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER,
          id,
          { spaceId, workflowIdSuffix: spaceId }
        )
      )
    );
    return {
      serviceAccountsEnabled: core.security.serviceAccounts.isEnabled(),
      serviceAccountId: NIGHTSHIFT_INVESTIGATOR_SERVICE_ACCOUNT_ID,
      workflowId: getBoundInvestigationWorkflowId(spaceId),
      installed: investigation.installed,
      enabled: investigation.enabled,
      slackThreadInstalled: slackThread.installed,
    };
  };

  /**
   * Ensures the investigator role and service account with the caller's privileges, then installs
   * the bound investigation and Slack thread workflows in the caller's space. Binding a workflow
   * to the account requires the caller to hold `manage_security`; the workflows plugin enforces
   * that too. Re-running it repairs a space whose workflows were removed.
   */
  const enable = async (
    request: KibanaRequest,
    spaceId: string
  ): Promise<InvestigatorServiceAccountStatus> => {
    if (!core.security.serviceAccounts.isEnabled()) {
      throw Boom.badRequest(
        'Service accounts are disabled. Set xpack.security.serviceAccounts.enabled: true.'
      );
    }
    const esClient = core.elasticsearch.client.asScoped(request).asCurrentUser;
    const { has_all_requested: canManageSecurity } = await esClient.security.hasPrivileges({
      cluster: ['manage_security'],
    });
    if (!canManageSecurity) {
      throw Boom.forbidden(
        'Setting up the Nightshift service account requires the manage_security cluster privilege.'
      );
    }
    await ensureRole(esClient);
    const serviceAccountId = await ensureServiceAccount(core, request);

    const client = await workflowsExtensions.getClient(request);
    // Both call the global investigation workflow, which runs as the account they are bound to.
    for (const id of [
      NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
      NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
    ] as const) {
      await client.managedWorkflows.install(NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER, id, {
        spaceId,
        workflowIdSuffix: spaceId,
        values: { serviceAccountId },
      });
    }
    logger.info(
      `Nightshift in space [${spaceId}] now runs as service account [${serviceAccountId}]`
    );
    return getStatus(request, spaceId);
  };

  /** Uninstalls the bound workflows; the space can no longer run investigations. */
  const disable = async (
    request: KibanaRequest,
    spaceId: string
  ): Promise<InvestigatorServiceAccountStatus> => {
    const client = await workflowsExtensions.getClient(request);
    for (const id of [
      NIGHTSHIFT_BOUND_SLACK_THREAD_WORKFLOW_ID,
      NIGHTSHIFT_BOUND_INVESTIGATION_WORKFLOW_ID,
    ] as const) {
      await client.managedWorkflows.uninstall(
        NIGHTSHIFT_INVESTIGATIONS_MANAGED_WORKFLOW_OWNER,
        id,
        {
          spaceId,
          workflowIdSuffix: spaceId,
        }
      );
    }
    return getStatus(request, spaceId);
  };

  return { enable, disable, getStatus };
};

export type InvestigatorServiceAccountService = ReturnType<
  typeof createInvestigatorServiceAccountService
>;
