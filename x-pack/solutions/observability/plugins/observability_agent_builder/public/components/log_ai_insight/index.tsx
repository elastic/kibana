/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { ObservabilityLogsAiInsightFeatureRenderDeps } from '@kbn/discover-shared-plugin/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { LogAIInsightDocument, LogAIInsightProps } from './ai_insight';
import type { ObservabilityAgentBuilderPluginStartDependencies } from '../../types';

export const LogAIInsight = dynamic(() => import('./ai_insight'));

export function createLogAIInsight(
  { onechat }: Pick<LogAIInsightProps, 'onechat'>,
  core: CoreStart,
  plugins: ObservabilityAgentBuilderPluginStartDependencies
) {
  return (props: Omit<LogAIInsightProps, 'onechat'>) => {
    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      ...core,
      ...plugins,
    });
    return (
      <KibanaReactContextProvider>
        <LogAIInsight onechat={onechat} {...props} />
      </KibanaReactContextProvider>
    );
  };
}

export const createLogsAIInsightRenderer =
  (LogAIInsightRender: ReturnType<typeof createLogAIInsight>) =>
  ({ doc }: ObservabilityLogsAiInsightFeatureRenderDeps) => {
    const mappedDoc = useMemo<LogAIInsightDocument>(
      () => ({
        fields: Object.entries(doc.flattened).map(([field, value]) => ({
          field,
          value: Array.isArray(value) ? value : [value],
        })),
      }),
      [doc]
    );

    return <LogAIInsightRender key={doc.id} doc={mappedDoc} />;
  };
