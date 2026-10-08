/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { isEmpty } from 'lodash';
import { STREAMS_TIERED_AI_FEATURE } from '@kbn/streams-plugin/common';
import { useKibana } from './use_kibana';
import { useGenAIConnectors, type UseGenAIConnectorsResult } from './use_genai_connectors';

export interface AIFeatures {
  loading: boolean;
  enabled: boolean;
  couldBeEnabled: boolean;
  genAiConnectors: UseGenAIConnectorsResult;
}

export function useAIFeatures(): AIFeatures | null {
  const {
    dependencies: {
      start: { licensing },
    },
    core,
  } = useKibana();

  const isAIAvailableForTier = core.pricing.isFeatureAvailable(STREAMS_TIERED_AI_FEATURE.id);

  const genAiConnectors = useGenAIConnectors();
  const license = useObservable(licensing.license$);

  if (!isAIAvailableForTier) {
    return null;
  }

  if (genAiConnectors.loading) {
    return {
      loading: true,
      enabled: false,
      couldBeEnabled: false,
      genAiConnectors,
    };
  }

  // Check for actions.show permission (read access is sufficient for listing connectors)
  const hasActionsPermission = core.application.capabilities.actions?.show || false;

  const enabled =
    Boolean(license?.hasAtLeast('enterprise')) &&
    hasActionsPermission &&
    !isEmpty(genAiConnectors.connectors);

  const couldBeEnabled = Boolean(
    license?.hasAtLeast('enterprise') && core.application.capabilities.actions?.show
  );

  return {
    loading: false,
    enabled,
    couldBeEnabled,
    genAiConnectors,
  };
}
