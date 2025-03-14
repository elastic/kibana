/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { JsonValue } from '@kbn/utility-types';

const field = 'related_integrations';
const subField = 'package';

export interface KibanaAlertSeverityCellRendererProps {
  /**
   *
   */
  value: Record<string, string | JsonValue[]>;
}

/**
 *
 */
export const KibanaAlertRelatedIntegrationCellRenderer = memo(
  ({ value }: KibanaAlertSeverityCellRendererProps) => {
    const displayValue: string = useMemo(() => {
      const relatedIntegration = value[field];
      if (!relatedIntegration) return '';

      const relatedIntegrationName = relatedIntegration[subField];
      return relatedIntegrationName || '';
    }, [value]);

    return <>{displayValue}</>;
  }
);

KibanaAlertRelatedIntegrationCellRenderer.displayName = 'KibanaAlertRelatedIntegrationCellRenderer';
