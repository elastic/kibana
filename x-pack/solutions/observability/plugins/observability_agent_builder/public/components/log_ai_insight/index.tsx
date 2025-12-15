/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { ObservabilityLogsAIInsightFeatureRenderDeps } from '@kbn/discover-shared-plugin/public';
import type { LogAIInsightDocument, LogAIInsightProps } from './ai_insight';

export const LogAIInsight = dynamic(() => import('./ai_insight'));

export function createLogAIInsight({ onechat }: Pick<LogAIInsightProps, 'onechat'>) {
  return (props: Omit<LogAIInsightProps, 'onechat'>) => (
    <LogAIInsight onechat={onechat} {...props} />
  );
}

export const createLogsAIInsightRenderer =
  (LogAIInsightRender: ReturnType<typeof createLogAIInsight>) =>
  ({ doc }: ObservabilityLogsAIInsightFeatureRenderDeps) => {
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
