/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTemplateRequiredConnector, MessageRole } from '@kbn/inference-common';
import type { InferenceClient } from '@kbn/inference-common';

/** EIS template id. Matches `docs/eis_prompt_templates/attack-discovery.yaml`. */
export const ATTACK_DISCOVERY_TEMPLATE_ID = 'attack-discovery';

export type AttackDiscoveryTemplatePhase = 'generate' | 'continue' | 'refine';

export interface AttackDiscoveryTemplateRequest {
  alerts: string[];
  phase: AttackDiscoveryTemplatePhase;
  partial?: string;
}

/** Returns the model text. The graph still parses it as JSON. */
export type AttackDiscoveryTemplateCompletion = (
  request: AttackDiscoveryTemplateRequest
) => Promise<string>;

/**
 * Calls chat completion with the pinned Attack Discovery template.
 * The empty message is not sent: the endpoint adapter drops messages when `template` is set.
 */
export const createAttackDiscoveryTemplateCompletion = ({
  inferenceClient,
  connectorId,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
}): AttackDiscoveryTemplateCompletion => {
  return async ({ alerts, phase, partial }) => {
    const response = await inferenceClient.chatComplete({
      connectorId,
      stream: false,
      messages: [{ role: MessageRole.User, content: '' }],
      template: {
        id: ATTACK_DISCOVERY_TEMPLATE_ID,
        variables: {
          alerts,
          phase,
          ...(partial ? { partial } : {}),
        },
      },
    });
    return response.content ?? '';
  };
};

/**
 * Returns a template completion when this connector rejects raw messages.
 * A missing `getConnectorById` (test doubles) or a lookup failure keeps the messages path.
 */
export const resolveAttackDiscoveryTemplateCompletion = async ({
  inferenceClient,
  connectorId,
}: {
  inferenceClient?: Pick<InferenceClient, 'chatComplete' | 'getConnectorById'>;
  connectorId: string;
}): Promise<AttackDiscoveryTemplateCompletion | undefined> => {
  if (inferenceClient?.getConnectorById == null) {
    return undefined;
  }

  try {
    const connector = await inferenceClient.getConnectorById(connectorId);
    if (!isTemplateRequiredConnector(connector)) {
      return undefined;
    }
  } catch {
    return undefined;
  }

  return createAttackDiscoveryTemplateCompletion({
    inferenceClient: inferenceClient as InferenceClient,
    connectorId,
  });
};
