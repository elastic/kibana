/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefendInsightType } from '@kbn/elastic-assistant-common';

import { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import {
  getIncompatibleAntivirusPrompt,
  DefendInsightsCombinedPrompts,
} from './incompatible_antivirus';
import { InvalidDefendInsightTypeError } from '../../../errors';

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
  if (type === DefendInsightType.Enum.incompatible_antivirus) {
    return getIncompatibleAntivirusPrompt(args);
  }

  throw new InvalidDefendInsightTypeError();
}
