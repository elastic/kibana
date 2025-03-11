/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { RegisterRenderFunctionDefinition } from '@kbn/observability-ai-assistant-plugin/public';
import type { ContextToolResponse } from '@kbn/observability-ai-assistant-plugin/server';
import React from 'react';
import { ObservabilityAIAssistantAppPluginStartDependencies } from '../../types';
import { RenderContext } from './render_context';

export function registerContextRenderFunction({
  registerRenderFunction,
  pluginsStart,
}: {
  registerRenderFunction: RegisterRenderFunctionDefinition;
  pluginsStart: ObservabilityAIAssistantAppPluginStartDependencies;
}) {
  // should get the connector icons from the searchConnectors plugin,
  // but that isn't shared
  const connectorIcons = new Map<string, string>();

  registerRenderFunction('context', ({ response }: { response: ContextToolResponse }) => {
    return <RenderContext response={response} connectorIcons={connectorIcons} />;
  });
}
