/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { isTemplateRequiredConnector, MessageRole } from '@kbn/inference-common';
import type { InferenceClient } from '@kbn/inference-common';

/** EIS template id. The file is `prompt-templates/attack-discovery/1.yaml` in eis-gateway. */
export const ATTACK_DISCOVERY_TEMPLATE_ID = '.attack-discovery';

/** Pinned version of {@link ATTACK_DISCOVERY_TEMPLATE_ID}. */
export const ATTACK_DISCOVERY_TEMPLATE_VERSION = 1;

/**
 * The only value the template accepts for `field_syntax`.
 * The gateway schema marks it `const`, so the braces the model must emit are not
 * written in the template source, which only allows `{{ .name }}` placeholders.
 */
const ATTACK_DISCOVERY_FIELD_SYNTAX =
  'Use {{ field.name fieldValue }} for every source field. Correct: {{ host.name host-a }}. Incorrect: {{ host-a }}.';

/** Gateway schema: `alerts` maxItems. A larger batch is a 400 that fails the generation. */
export const ATTACK_DISCOVERY_TEMPLATE_MAX_ALERTS = 100;

/** Explains a template batch that was shortened to the gateway maximum. */
export const attackDiscoveryTemplateOmissionMessage = (
  omitted: number,
  requested: number
): string =>
  `Attack Discovery prompt template analyzes at most ${ATTACK_DISCOVERY_TEMPLATE_MAX_ALERTS} alerts; omitting ${omitted} of ${requested}.`;

/** Caps a retrieval size at the template maximum. Undefined stays undefined. */
export const capAttackDiscoveryTemplateCount = (count: number | undefined): number | undefined =>
  count == null ? undefined : Math.min(count, ATTACK_DISCOVERY_TEMPLATE_MAX_ALERTS);

/**
 * Keeps the prefix of `alerts` the gateway schema accepts.
 * `omitted` is 0 when the list already fits.
 */
export const takeAttackDiscoveryTemplateAlerts = <T>(
  alerts: T[]
): { alerts: T[]; omitted: number } => {
  if (alerts.length <= ATTACK_DISCOVERY_TEMPLATE_MAX_ALERTS) {
    return { alerts, omitted: 0 };
  }
  return {
    alerts: alerts.slice(0, ATTACK_DISCOVERY_TEMPLATE_MAX_ALERTS),
    omitted: alerts.length - ATTACK_DISCOVERY_TEMPLATE_MAX_ALERTS,
  };
};

/**
 * Returns the template alert maximum when this connector rejects raw messages.
 * A lookup failure keeps the messages path, which has no template cap.
 */
export const getAttackDiscoveryTemplateAlertLimit = async (
  getConnector: () => Promise<unknown>
): Promise<number | undefined> => {
  try {
    const connector = await getConnector();
    if (
      connector != null &&
      typeof connector === 'object' &&
      isTemplateRequiredConnector(connector as Parameters<typeof isTemplateRequiredConnector>[0])
    ) {
      return ATTACK_DISCOVERY_TEMPLATE_MAX_ALERTS;
    }
  } catch {
    return undefined;
  }
  return undefined;
};

/** Gateway schema: each alert string maxLength. */
const MAX_TEMPLATE_ALERT_CHARS = 8000;

/** Gateway schema: `partial` maxLength. */
const MAX_TEMPLATE_PARTIAL_CHARS = 100_000;

const clampTemplateAlerts = (alerts: string[]): string[] =>
  alerts
    .slice(0, ATTACK_DISCOVERY_TEMPLATE_MAX_ALERTS)
    .map((alert) => alert.slice(0, MAX_TEMPLATE_ALERT_CHARS));

const clampTemplatePartial = (partial: string): string =>
  partial.slice(0, MAX_TEMPLATE_PARTIAL_CHARS);

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
 * First refine pass sends the unrefined insights. A later pass continues the
 * partial JSON the model already wrote, matching the messages refine prompt.
 */
export const attackDiscoveryRefineTemplateRequest = ({
  alerts,
  combinedRefinements,
  unrefinedResults,
}: {
  alerts: string[];
  combinedRefinements: string;
  unrefinedResults: unknown;
}): AttackDiscoveryTemplateRequest => {
  const continuing = combinedRefinements.length > 0;
  return {
    alerts,
    phase: continuing ? 'continue' : 'refine',
    partial: continuing ? combinedRefinements : JSON.stringify({ insights: unrefinedResults }),
  };
};

/**
 * Calls chat completion with the pinned Attack Discovery template.
 * The empty message is not sent: the endpoint adapter drops messages when `template` is set.
 */
export const createAttackDiscoveryTemplateCompletion = ({
  inferenceClient,
  connectorId,
  logger,
  timeout,
}: {
  inferenceClient: InferenceClient;
  connectorId: string;
  logger?: Logger;
  /** Connector timeout, in milliseconds. The messages path already forwards this. */
  timeout?: number;
}): AttackDiscoveryTemplateCompletion => {
  return async ({ alerts, phase, partial }) => {
    const limitedAlerts = clampTemplateAlerts(alerts);
    if (logger && limitedAlerts.length < alerts.length) {
      logger.warn(
        attackDiscoveryTemplateOmissionMessage(alerts.length - limitedAlerts.length, alerts.length)
      );
    }
    const response = await inferenceClient.chatComplete({
      connectorId,
      stream: false,
      messages: [{ role: MessageRole.User, content: '' }],
      template: {
        id: ATTACK_DISCOVERY_TEMPLATE_ID,
        version: ATTACK_DISCOVERY_TEMPLATE_VERSION,
        variables: {
          alerts: limitedAlerts,
          phase,
          partial: clampTemplatePartial(partial ?? ''),
          field_syntax: ATTACK_DISCOVERY_FIELD_SYNTAX,
        },
      },
      ...(timeout !== undefined ? { timeout } : {}),
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
  logger,
  timeout,
}: {
  inferenceClient?: Pick<InferenceClient, 'chatComplete' | 'getConnectorById'>;
  connectorId: string;
  logger?: Logger;
  timeout?: number;
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
    logger,
    timeout,
  });
};
