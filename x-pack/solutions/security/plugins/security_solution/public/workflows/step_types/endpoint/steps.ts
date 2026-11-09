/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { findEndpointArtifactsStepCommonDefinition } from '../../../../common/workflows/step_types/endpoint/artifacts';
import { searchIntegrationKnowledgeStepCommonDefinition } from '../../../../common/workflows/step_types/endpoint/integration_knowledge/search_integration_knowledge_step_common';

export const findEndpointArtifactsPublicStepDefinition = createPublicStepDefinition({
  ...findEndpointArtifactsStepCommonDefinition,
});

export const searchIntegrationKnowledgePublicStepDefinition = createPublicStepDefinition({
  ...searchIntegrationKnowledgeStepCommonDefinition,
});
