/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { PromptContext } from '@kbn/elastic-assistant';
import { useKibana } from '../../../common/lib/kibana';
import { useDefaultAIConnectorId } from '../../../common/hooks/use_default_ai_connector_id';
import { AlertSummary } from './alert_summary';

export interface AiSummaryProps {
  hit: DataTableRecord;
  showAnonymizedValues?: boolean;
  setHasAlertSummary: React.Dispatch<React.SetStateAction<boolean>>;
  eventId?: string;
}

const toStringValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const getPromptContextFromHit = (hit: DataTableRecord): Record<string, string[]> => {
  return Object.entries(hit.flattened ?? {}).reduce<Record<string, string[]>>(
    (acc, [field, value]) => {
      if (field.startsWith('signal.')) {
        return acc;
      }

      if (Array.isArray(value)) {
        acc[field] = value.filter((v): v is unknown => v != null).map(toStringValue);
        return acc;
      }

      if (value == null) {
        acc[field] = [];
        return acc;
      }

      acc[field] = [toStringValue(value)];
      return acc;
    },
    {}
  );
};

export const AiSummary = memo(
  ({ eventId, hit, setHasAlertSummary, showAnonymizedValues }: AiSummaryProps) => {
    const {
      application: { capabilities },
    } = useKibana().services;
    const { defaultConnectorId, isLoading: isLoadingDefaultConnectorId } =
      useDefaultAIConnectorId();

    const alertId = useMemo(() => {
      if (eventId) {
        return eventId;
      }

      const rawId = hit.raw._id;
      return typeof rawId === 'string' ? rawId : '';
    }, [eventId, hit.raw._id]);

    const getPromptContext = useCallback(async () => getPromptContextFromHit(hit), [hit]);
    const promptContext: PromptContext = useMemo(
      () => ({
        category: 'alert',
        description: 'Alert summary',
        getPromptContext,
        id: `contextId-${alertId}`,
        tooltip: '',
      }),
      [alertId, getPromptContext]
    );

    const canSeeAdvancedSettings = capabilities.management.kibana.settings ?? false;

    if (isLoadingDefaultConnectorId) {
      return <EuiSkeletonText lines={3} size="s" />;
    }

    return (
      <AlertSummary
        alertId={alertId}
        canSeeAdvancedSettings={canSeeAdvancedSettings}
        defaultConnectorId={defaultConnectorId}
        promptContext={promptContext}
        setHasAlertSummary={setHasAlertSummary}
        showAnonymizedValues={showAnonymizedValues}
      />
    );
  }
);

AiSummary.displayName = 'AiSummary';
