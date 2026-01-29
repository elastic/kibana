/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { DefendInsightType } from '@kbn/elastic-assistant-common';

import { InvalidDefendInsightTypeError } from '../../../errors';
import { getIncompatibleAntivirusPrompt } from './incompatible_antivirus';
import { getPolicyResponseFailurePrompt } from './policy_response_failure';

export interface DefendInsightsPrompts {
  default: string;
  refine: string;
  continue: string;
}

export interface DefendInsightsGenerationPrompts {
  group: string;
  events: string;
  eventsId: string;
  eventsEndpointId: string;
  eventsValue: string;
  remediation?: string;
  remediationMessage?: string;
  remediationLink?: string;
}

export type DefendInsightsCombinedPrompts = DefendInsightsPrompts & DefendInsightsGenerationPrompts;

export function getDefendInsightsPrompt({
  type,
  ...args
}: {
  type: DefendInsightType;
  actionsClient: PublicMethodsOf<ActionsClient>;
  connector?: Connector;
  connectorId: string;
  model?: string;
  provider?: string;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<DefendInsightsCombinedPrompts> {
  switch (type) {
    case DefendInsightType.Enum.incompatible_antivirus:
      return getIncompatibleAntivirusPrompt(args);
    case DefendInsightType.Enum.policy_response_failure:
      return getPolicyResponseFailurePrompt(args);
    default:
      throw new InvalidDefendInsightTypeError();
  }
}
