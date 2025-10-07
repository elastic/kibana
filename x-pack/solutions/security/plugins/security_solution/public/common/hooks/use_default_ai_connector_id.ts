import { AI_ASSISTANT_DEFAULT_LLM_SETTING_ENABLED, DEFAULT_AI_CONNECTOR } from "@kbn/security-solution-plugin/common/constants";
import { useAIConnectors } from "./use_ai_connectors";
import { useKibana } from '../lib/kibana';
import { getDefaultConnector } from "@kbn/elastic-assistant/impl/assistant/helpers";
import { useMemo } from "react";

export const useDefaultAIConnectorId = (): string | undefined => {
    const { settings, uiSettings, featureFlags } = useKibana().services;
  
    const { aiConnectors: connectors } = useAIConnectors();
    const legacyDefaultConnectorId = uiSettings.get<string>(DEFAULT_AI_CONNECTOR);
    const useNewDefaultConnector = featureFlags.getBooleanValue(
      AI_ASSISTANT_DEFAULT_LLM_SETTING_ENABLED,
      false
    );
    const newDefaultConnectorId = getDefaultConnector(connectors, settings)?.id;
  
    return useMemo(() => useNewDefaultConnector ? newDefaultConnectorId : legacyDefaultConnectorId, [useNewDefaultConnector, newDefaultConnectorId, legacyDefaultConnectorId]);
  };