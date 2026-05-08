/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { AlertsDetailsTable } from '../../../cloud_security_posture/components/csp_details/alerts_findings_details_table';
import type { CloudPostureEntityIdentifier } from '../../../cloud_security_posture/components/entity_insight';
import { ENTITY_ALERTS_DETAILS_VIEW_TEST_ID } from '../test_ids';

export interface EntityAlertsDetailsViewProps {
  /**
   * Identity field used to scope the alerts query (`host.name` or `user.name`).
   */
  field: CloudPostureEntityIdentifier;
  /**
   * Identity value (host name or user name).
   */
  value: string;
  /**
   * Canonical entity store id (`host.entity.id` / `user.entity.id`) when resolved.
   */
  entityId?: string;
  /**
   * Entity type the alerts table should query against.
   */
  entityType: 'host' | 'user';
  /**
   * Override invoked when the user clicks the expand icon on an alert row. v2 callers wire this
   * to open a nested document flyout via `overlays.openSystemFlyout`. When omitted, the table
   * falls back to the legacy `openPreviewPanel` API which is a no-op outside the legacy flyout.
   */
  onAlertOpened?: (eventId: string, indexName: string) => void;
}

/**
 * Chrome-free body of the entity alerts flyout. Renders the existing
 * AlertsDetailsTable so the v2 surface matches the legacy left-panel content.
 */
export const EntityAlertsDetailsView: FC<EntityAlertsDetailsViewProps> = ({
  field,
  value,
  entityId,
  entityType,
  onAlertOpened,
}) => (
  <div data-test-subj={ENTITY_ALERTS_DETAILS_VIEW_TEST_ID}>
    <AlertsDetailsTable
      field={field}
      value={value}
      entityId={entityId}
      entityType={entityType}
      onAlertOpened={onAlertOpened}
    />
  </div>
);

EntityAlertsDetailsView.displayName = 'EntityAlertsDetailsView';
