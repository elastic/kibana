/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { concat, of } from 'rxjs';
import type { ChatCompletionEvent, InferenceConnector } from '@kbn/inference-common';
import { getConnectorFamily, getConnectorProvider, getConnectorModel } from '@kbn/inference-common';
import type { ConnectorInfo } from '../../../common';

export type { ConnectorInfo };

export interface ContextEvent {
  type: 'context';
  context: string;
  [key: string]: unknown;
}

export interface ConnectorInfoEvent {
  type: 'connectorInfo';
  connector: ConnectorInfo;
  [key: string]: unknown;
}

export type AiInsightEvent = ChatCompletionEvent | ContextEvent | ConnectorInfoEvent;

export interface AiInsightResult {
  events$: Observable<AiInsightEvent>;
  context: string;
}

/**
 * Builds ConnectorInfo from an InferenceConnector
 */
export function buildConnectorInfo(connector: InferenceConnector): ConnectorInfo {
  return {
    connectorId: connector.connectorId,
    name: connector.name,
    type: connector.type,
    modelFamily: getConnectorFamily(connector),
    modelProvider: getConnectorProvider(connector),
    modelId: getConnectorModel(connector) ?? 'unknown',
  };
}

/**
 * Creates an AiInsightResult by prepending context and connector info events to the chat completion stream.
 */
export function createAiInsightResult(
  context: string,
  connector: InferenceConnector,
  events$: Observable<ChatCompletionEvent>
): AiInsightResult {
  const connectorInfo = buildConnectorInfo(connector);

  return {
    events$: concat(
      of<ContextEvent>({ type: 'context', context }),
      of<ConnectorInfoEvent>({ type: 'connectorInfo', connector: connectorInfo }),
      events$
    ),
    context,
  };
}
