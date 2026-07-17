/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import { registerSignificantEventDetectionAttachment } from './detection_attachment';
import { registerSignificantEventFeatureAttachment } from './feature_attachment';

export const registerNightshiftAgentBuilderAttachments = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPluginStart;
}): void => {
  registerSignificantEventFeatureAttachment({ agentBuilder });
  registerSignificantEventDetectionAttachment({ agentBuilder });
};
