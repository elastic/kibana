/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { AnomaliesTab } from '../../../../../entity_analytics/components/anomalies/anomalies_tab';
import { ANOMALY_INSIGHTS_TITLE } from '../../../../shared/constants/flyout_titles';
import { ANOMALY_INSIGHTS_TOOL_TEST_ID } from './test_ids';

const TITLE = ANOMALY_INSIGHTS_TITLE;

const ICON_TYPE = { [EntityType.host]: 'storage', [EntityType.user]: 'user' } as const;

export interface AnomalyInsightsProps {
  /** Whether this tool is scoped to a host or user entity. Controls the icon and the entity type passed to the tab. */
  entityType: EntityType.host | EntityType.user;
  /** Entity name shown in the header context label (`host.name` for hosts, `user.name` for users). */
  value: string;
  /** Canonical Entity Store v2 id (`entity.id`) used to query anomalies. */
  entityId?: string;
  /** Opens the originating entity flyout as a child. */
  onOpenEntity?: () => void;
}

/**
 * Tool flyout displaying the full behavioral anomalies view for an entity.
 */
export const AnomalyInsights = memo(
  ({ entityType, value, entityId, onOpenEntity }: AnomalyInsightsProps) => {
    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <ToolsFlyoutHeader
            title={TITLE}
            onTitleClick={onOpenEntity}
            label={value}
            iconType={ICON_TYPE[entityType]}
          />
        </EuiFlyoutHeader>
        <EuiFlyoutBody data-test-subj={ANOMALY_INSIGHTS_TOOL_TEST_ID}>
          <AnomaliesTab entityId={entityId ?? ''} entityType={entityType} />
        </EuiFlyoutBody>
      </>
    );
  }
);

AnomalyInsights.displayName = 'AnomalyInsights';
