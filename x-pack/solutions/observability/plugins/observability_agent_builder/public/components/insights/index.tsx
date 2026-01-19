/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { ObservabilityLogsAiInsightFeatureRenderDeps } from '@kbn/discover-shared-plugin/public';
import type { ObservabilityAgentBuilderPluginStartDependencies } from '../../types';
import type { AlertAiInsightProps } from './alert_ai_insight';
import type { ErrorSampleAiInsightProps } from './error_sample_ai_insight';
import type { LogAiInsightProps, LogAiInsightDocument } from './log_ai_insight';

export type { AlertAiInsightProps } from './alert_ai_insight';
export type { ErrorSampleAiInsightProps } from './error_sample_ai_insight';
export type { LogAiInsightProps, LogAiInsightDocument } from './log_ai_insight';

const AlertAiInsightLazy = dynamic(() =>
  import('./alert_ai_insight').then((m) => ({ default: m.AlertAiInsight }))
);

const ErrorSampleAiInsightLazy = dynamic(() =>
  import('./error_sample_ai_insight').then((m) => ({ default: m.ErrorSampleAiInsight }))
);

const LogAiInsightLazy = dynamic(() =>
  import('./log_ai_insight').then((m) => ({ default: m.LogAiInsight }))
);

export function createAlertAIInsight(
  core: CoreStart,
  plugins: ObservabilityAgentBuilderPluginStartDependencies
) {
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    ...core,
    ...plugins,
  });

  return (props: AlertAiInsightProps) => (
    <KibanaReactContextProvider>
      <AlertAiInsightLazy {...props} />
    </KibanaReactContextProvider>
  );
}

export function createErrorSampleAIInsight(
  core: CoreStart,
  plugins: ObservabilityAgentBuilderPluginStartDependencies
) {
  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    ...core,
    ...plugins,
  });

  return (props: ErrorSampleAiInsightProps) => (
    <KibanaReactContextProvider>
      <ErrorSampleAiInsightLazy {...props} />
    </KibanaReactContextProvider>
  );
}

export function createLogAIInsight(
  core: CoreStart,
  plugins: ObservabilityAgentBuilderPluginStartDependencies
) {
  return (props: LogAiInsightProps) => {
    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      ...core,
      ...plugins,
    });
    return (
      <KibanaReactContextProvider>
        <LogAiInsightLazy {...props} />
      </KibanaReactContextProvider>
    );
  };
}

export const createLogsAIInsightRenderer =
  (LogAIInsightRender: ReturnType<typeof createLogAIInsight>) =>
  ({ doc }: ObservabilityLogsAiInsightFeatureRenderDeps) => {
    const mappedDoc = useMemo<LogAiInsightDocument>(
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
