/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { AIConnector } from '@kbn/elastic-assistant';
import { useState, useEffect } from 'react';
import { loadAiConnectors } from '../../../../onboarding/components/onboarding_body/cards/common/connectors/ai_connectors';

export const useGetAIConnectors = (http: HttpSetup) => {
  const [aiConnectors, setAiConnectors] = useState<AIConnector[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (aiConnectors.length > 0) return;
    setIsLoading(true);
    loadAiConnectors(http).then((connectors) => {
      setAiConnectors(connectors);
      setIsLoading(false);
    });
  }, [aiConnectors, http]);

  return {
    aiConnectors,
    isLoading,
  };
};
