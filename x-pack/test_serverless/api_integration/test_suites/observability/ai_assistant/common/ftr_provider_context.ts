/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GenericFtrProviderContext } from '@kbn/test';
import { InheritedServices, InheritedFtrProviderContext } from '../../../../services';
import { ObservabilityAIAssistantApiClient } from './observability_ai_assistant_api_client';

export type ObservabilityAIAssistantServices = InheritedServices & {
  observabilityAIAssistantAPIClient: (
    context: InheritedFtrProviderContext
  ) => Promise<ObservabilityAIAssistantApiClient>;
};

export type FtrProviderContext = GenericFtrProviderContext<ObservabilityAIAssistantServices, {}>;
