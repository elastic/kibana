/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';

const field = 'related_integrations';
const subField = 'package';

export interface KibanaAlertSeverityCellRendererProps {
  /**
   *
   */
  value: string | string[];
}

/**
 *
 */
export const KibanaAlertRelatedIntegrationCellRenderer = memo(
  ({ value }: KibanaAlertSeverityCellRendererProps) => {
    const displayValue: string = useMemo(() => {
      const stringValue = Array.isArray(value) ? value[0] : value;
      const displayJSON = JSON.parse(stringValue);
      if (!displayJSON) return '';

      const relatedIntegration = displayJSON[field];
      if (!relatedIntegration) return '';

      const relatedIntegrationName = relatedIntegration[subField];
      return relatedIntegrationName || '';
    }, [value]);

    return <>{displayValue}</>;
  }
);

KibanaAlertRelatedIntegrationCellRenderer.displayName = 'KibanaAlertRelatedIntegrationCellRenderer';
