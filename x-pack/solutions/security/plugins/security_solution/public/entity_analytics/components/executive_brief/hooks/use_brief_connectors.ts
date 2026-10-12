/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { useLoadConnectors } from '@kbn/inference-connectors';
import type { AIConnector } from '@kbn/inference-connectors';
import { EXECUTIVE_BRIEF_INFERENCE_FEATURE_ID } from '../../../../../common/entity_analytics/executive_brief/constants';
import { useKibana } from '../../../../common/lib/kibana';

export interface UseBriefConnectorsResult {
  connectors: AIConnector[];
  isLoading: boolean;
  /** The user's pick if still available, otherwise the first connector (the server orders by preference). */
  selectedId: string | undefined;
  setSelectedId: (id: string) => void;
  getConnectorName: (connectorId: string | undefined) => string | undefined;
}

/** Loads the AI connectors available to the brief's inference feature. */
export const useBriefConnectors = (): UseBriefConnectorsResult => {
  const { http } = useKibana().services;
  const { data, isLoading } = useLoadConnectors({
    http,
    featureId: EXECUTIVE_BRIEF_INFERENCE_FEATURE_ID,
  });
  const connectors = useMemo(() => data ?? [], [data]);
  const [chosenId, setChosenId] = useState<string | undefined>();

  const selectedId = connectors.some(({ id }) => id === chosenId) ? chosenId : connectors[0]?.id;

  const getConnectorName = useCallback(
    (connectorId: string | undefined) => connectors.find(({ id }) => id === connectorId)?.name,
    [connectors]
  );

  return { connectors, isLoading, selectedId, setSelectedId: setChosenId, getConnectorName };
};
