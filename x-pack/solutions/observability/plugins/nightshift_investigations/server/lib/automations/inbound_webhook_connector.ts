/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { NightshiftAutomationTrigger } from './types';

export const INBOUND_WEBHOOK_CONNECTOR_TYPE_ID = '.inboundWebhook';

/** The connector provisioned for the automation's webhook trigger, if it has one. */
export function getWebhookConnectorId(trigger: NightshiftAutomationTrigger): string | undefined {
  for (const row of trigger.rows) {
    if (row.kind === 'webhook') return row.connectorId;
  }
  return undefined;
}

type InboundWebhookActionsClient = Pick<
  ActionsClient,
  'create' | 'delete' | 'rotateInboundIngress'
>;

export interface ProvisionedInboundWebhook {
  connectorId: string;
  /** Shown once: the platform stores only a hash, so it cannot be read back. */
  ingestToken: string;
}

/**
 * One `.inboundWebhook` connector per automation, so each automation has its own URL and token and
 * deleting the automation revokes exactly its own endpoint. The connector's create call does not
 * return a token, so one is minted straight after.
 */
export async function provisionInboundWebhook(
  actionsClient: InboundWebhookActionsClient,
  automationName: string
): Promise<ProvisionedInboundWebhook> {
  const connector = await actionsClient.create({
    action: {
      name: `Nightshift webhook: ${automationName}`,
      actionTypeId: INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
      config: {},
      secrets: { authType: 'none' },
    },
  });

  try {
    const { ingestToken } = await actionsClient.rotateInboundIngress({ id: connector.id });
    return { connectorId: connector.id, ingestToken };
  } catch (err) {
    await deleteInboundWebhook(actionsClient, connector.id);
    throw err;
  }
}

/** Mints a new token for the automation's connector, which stops the previous one working. */
export async function rotateInboundWebhookToken(
  actionsClient: InboundWebhookActionsClient,
  connectorId: string
): Promise<string> {
  const { ingestToken } = await actionsClient.rotateInboundIngress({ id: connectorId });
  return ingestToken;
}

/** Best effort: a connector that is already gone is the outcome the caller wants. */
export async function deleteInboundWebhook(
  actionsClient: InboundWebhookActionsClient,
  connectorId: string
): Promise<void> {
  try {
    await actionsClient.delete({ id: connectorId });
  } catch {
    // Already deleted, or not ours to delete: nothing further to clean up here.
  }
}
