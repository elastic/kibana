/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo, useState } from 'react';
import { useLoadConnectors } from '@kbn/inference-connectors';
import type { AIConnector } from '@kbn/inference-connectors';
import { GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR } from '@kbn/management-settings-ids';
import type { BriefGeneratorKind } from '../../../../../common/entity_analytics/executive_brief/types';
import { useKibana } from '../../../../common/lib/kibana';
import { pickDefaultConnector } from './pick_default_connector';

/** Value of the picker option that selects the deterministic template generator. */
export const TEMPLATE_OPTION_ID = 'template';

/** Which generator (and connector) the next generation will use. */
export interface BriefGenerationSelection {
  /** False while connectors are loading: the first generation waits for it. */
  isReady: boolean;
  generator: BriefGeneratorKind;
  connectorId?: string;
}

export interface UseBriefConnectorsResult {
  connectors: AIConnector[];
  isLoading: boolean;
  /** Connector id, or TEMPLATE_OPTION_ID. */
  selectedId: string;
  setSelectedId: (id: string) => void;
  selection: BriefGenerationSelection;
  /** Display name of the selected model, or undefined for the template generator. */
  selectedName: string | undefined;
  getConnectorName: (connectorId: string | undefined) => string | undefined;
}

/** Loads the AI connectors and resolves the generator selection (LLM by default, template fallback). */
export const useBriefConnectors = (): UseBriefConnectorsResult => {
  const { http, settings } = useKibana().services;
  const { data, isLoading } = useLoadConnectors({ http, featureId: 'attack_discovery', settings });
  const connectors = useMemo(() => data ?? [], [data]);
  const [chosenId, setChosenId] = useState<string | undefined>();

  const defaultConnectorId = settings?.client?.get<string | undefined>(
    GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR
  );
  const defaultId = useMemo(
    () => pickDefaultConnector(connectors, defaultConnectorId)?.id ?? TEMPLATE_OPTION_ID,
    [connectors, defaultConnectorId]
  );

  const chosenIsValid =
    chosenId === TEMPLATE_OPTION_ID || connectors.some(({ id }) => id === chosenId);
  const selectedId = chosenId !== undefined && chosenIsValid ? chosenId : defaultId;
  const isTemplate = selectedId === TEMPLATE_OPTION_ID;

  const getConnectorName = useCallback(
    (connectorId: string | undefined) =>
      connectors.find(({ id }) => id === connectorId)?.name ?? undefined,
    [connectors]
  );

  const selection = useMemo<BriefGenerationSelection>(
    () => ({
      isReady: !isLoading,
      generator: isTemplate ? 'template' : 'inference',
      connectorId: isTemplate ? undefined : selectedId,
    }),
    [isLoading, isTemplate, selectedId]
  );

  return {
    connectors,
    isLoading,
    selectedId,
    setSelectedId: setChosenId,
    selection,
    selectedName: isTemplate ? undefined : getConnectorName(selectedId),
    getConnectorName,
  };
};
