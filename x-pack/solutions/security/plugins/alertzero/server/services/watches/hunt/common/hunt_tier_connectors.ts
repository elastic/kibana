/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SearchInferenceEndpointsPluginStart } from '@kbn/search-inference-endpoints/server';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';

const NO_DEFAULT_CONNECTOR = 'NO_DEFAULT_CONNECTOR';

/**
 * Every deployment-default connector worth trying, in preference order: the
 * operator's `genAi:defaultAIConnector`, then the inference default.
 *
 * Both are collected rather than just the first that resolves. The setting can
 * name a connector that has since been deleted or had its credentials revoked,
 * and returning only that id meant a stale setting took Tier 2 down even where
 * another usable default existed — the caller could not tell "this id is the
 * answer" from "this id is the first guess".
 */
const resolveFallbackConnectors = async ({
  uiSettingsClient,
  inference,
  request,
}: {
  uiSettingsClient: IUiSettingsClient;
  inference: InferenceServerStart;
  request: KibanaRequest;
}): Promise<Array<{ connectorId: string; label: string }>> => {
  const candidates: Array<{ connectorId: string; label: string }> = [];

  try {
    const defaultSetting = await uiSettingsClient.get<string>(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR);
    if (defaultSetting && defaultSetting !== NO_DEFAULT_CONNECTOR) {
      candidates.push({ connectorId: defaultSetting, label: 'genAi-default' });
    }
  } catch {
    // UI setting may not be registered; the inference default still applies.
  }

  try {
    const connector = await inference.getDefaultConnector(request);
    const connectorId = connector?.connectorId;
    if (connectorId && !candidates.some((candidate) => candidate.connectorId === connectorId)) {
      candidates.push({ connectorId, label: 'inference-default' });
    }
  } catch {
    // No connectors available.
  }

  return candidates;
};

/** What the registry said about a tier, from one default-mode read. */
export interface HuntTierRead {
  /** The first endpoint of the tier's list, which Hunt tries first. */
  connectorId?: string;
  /** True when an operator saved a pick for the tier, even if its models no longer exist. */
  soEntryFound: boolean;
  /** True when the first endpoint is one of the tier's provisioned recommendations. */
  isRecommended: boolean;
}

const NOTHING_READ: HuntTierRead = { soEntryFound: false, isRecommended: false };

/**
 * Reads a model tier's list from the registry in default mode and reports its first endpoint.
 *
 * Default mode is not "what the operator picked": with no pick and no provisioned recommendation
 * the registry returns the whole connector catalog, platform default first, so the first entry
 * can be an unrelated connector (and is not flagged `isRecommended`). The tiers register with
 * `ignoreGlobalDefault: true`, so the operator's `genAi:defaultAIConnector` is not in that list
 * either. Agent Builder's fast model and `discoveries` instead read `onlyReturnConfigured` and
 * fall back to that setting explicitly. Hunt keeps the default-mode behaviour to match the other
 * AlertZero workflows, so a change there should be made for all of them together.
 *
 * The list is empty when a pick exists but its models are gone, or when there is no connector at
 * all. A failed read is treated the same way, so the caller moves on to the deployment defaults.
 *
 * `purpose` only changes the wording of the warning on a failed read, so a settings-page request
 * does not log as though a hunt had fallen through.
 */
export const readHuntTier = async ({
  searchInferenceEndpoints,
  featureId,
  request,
  logger,
  purpose = 'resolve',
}: {
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined;
  featureId: string;
  request: KibanaRequest;
  logger: Logger;
  /** `resolve` when Hunt is picking a model, `report` when the readiness status is describing it. */
  purpose?: 'resolve' | 'report';
}): Promise<HuntTierRead> => {
  if (!searchInferenceEndpoints) return NOTHING_READ;
  try {
    const { endpoints, soEntryFound } = await searchInferenceEndpoints.endpoints.getForFeature(
      featureId,
      request
    );
    const [first] = endpoints;
    return {
      connectorId: first?.connectorId,
      soEntryFound,
      isRecommended: first?.isRecommended === true,
    };
  } catch (err) {
    logger.warn(
      purpose === 'resolve'
        ? `[hunt:connector] tier '${featureId}' could not be resolved, falling through. ${
            (err as Error).message
          }`
        : `[hunt:readiness] tier '${featureId}' could not be read, reporting it as having no model of its own. ${
            (err as Error).message
          }`
    );
    return NOTHING_READ;
  }
};

export interface HuntConnectorCandidate {
  connectorId: string;
  /** Where the candidate came from, for logs: `tier:<featureId>`, `genAi-default` or `inference-default`. */
  label: string;
  /** `tier` for the tier's own first endpoint, `fallback` for a deployment default. */
  source: 'tier' | 'fallback';
}

export interface HuntTierWalk<T> {
  /** What the registry said about the tier, whether or not a candidate was accepted. */
  tier: HuntTierRead;
  /** The first candidate `accept` returned a value for, with where it came from. */
  accepted?: { value: T; connector: HuntConnectorCandidate };
}

/**
 * The one place the order Hunt resolves a model tier in lives: the tier's own first endpoint,
 * then the genAi default connector, then the inference default. Candidates are offered to
 * `accept` lazily, in that order, and the first value it returns wins, so a tier that resolves
 * first time never reads the deployment defaults.
 *
 * `resolveScopedModel` accepts a candidate by building its model, and the Hunt readiness status
 * accepts one by checking that the connector exists. Both therefore follow the same order and
 * cannot disagree about which connector a tier would run on.
 */
export const walkHuntTierConnectors = async <T extends object | string | number | boolean>({
  searchInferenceEndpoints,
  inference,
  uiSettingsClient,
  featureId,
  request,
  logger,
  purpose,
  accept,
}: {
  searchInferenceEndpoints: SearchInferenceEndpointsPluginStart | undefined;
  inference: InferenceServerStart;
  uiSettingsClient: IUiSettingsClient;
  featureId: string;
  request: KibanaRequest;
  logger: Logger;
  /** See `readHuntTier`. */
  purpose?: 'resolve' | 'report';
  /**
   * Returns a value to accept the candidate, or `undefined`/`null` to reject it. `T` excludes both
   * so a real value can never be mistaken for a rejection.
   */
  accept: (connector: HuntConnectorCandidate) => Promise<T | undefined | null>;
}): Promise<HuntTierWalk<T>> => {
  const tier = await readHuntTier({
    searchInferenceEndpoints,
    featureId,
    request,
    logger,
    purpose,
  });

  if (tier.connectorId) {
    const connector: HuntConnectorCandidate = {
      connectorId: tier.connectorId,
      label: `tier:${featureId}`,
      source: 'tier',
    };
    const value = await accept(connector);
    if (value != null) return { tier, accepted: { value, connector } };
  }

  const fallbacks = await resolveFallbackConnectors({ inference, request, uiSettingsClient });
  for (const { connectorId, label } of fallbacks) {
    const connector: HuntConnectorCandidate = { connectorId, label, source: 'fallback' };
    const value = await accept(connector);
    if (value != null) return { tier, accepted: { value, connector } };
  }

  return { tier };
};
