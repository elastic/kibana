/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { AlertsDetailsTable } from '../../../cloud_security_posture/components/csp_details/alerts_findings_details_table';
import { MisconfigurationFindingsDetailsTable } from '../../../cloud_security_posture/components/csp_details/misconfiguration_findings_details_table';
import { VulnerabilitiesFindingsDetailsTable } from '../../../cloud_security_posture/components/csp_details/vulnerabilities_findings_details_table';
import type { CloudPostureEntityIdentifier } from '../../../cloud_security_posture/components/entity_insight';
import {
  ENTITY_ALERTS_DETAILS_VIEW_TEST_ID,
  ENTITY_MISCONFIGURATIONS_DETAILS_VIEW_TEST_ID,
  ENTITY_VULNERABILITIES_DETAILS_VIEW_TEST_ID,
} from '../test_ids';

interface CommonProps {
  /**
   * Identity field used to scope the findings query (`host.name` or `user.name`).
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
   * Entity type the findings query should target.
   */
  entityType: 'host' | 'user';
}

export type EntityFindingsDetailsViewProps = CommonProps &
  (
    | {
        kind: 'alerts';
        /**
         * Override invoked when the user clicks the expand icon on an alert row. v2 callers wire
         * this to open a nested document flyout via `overlays.openSystemFlyout`. When omitted, the
         * table falls back to the legacy `openPreviewPanel` API which is a no-op outside the legacy
         * flyout.
         */
        onAlertOpened?: (eventId: string, indexName: string) => void;
      }
    | {
        kind: 'misconfigurations';
        /**
         * Scope id forwarded to the findings table for cell actions.
         */
        scopeId: string;
      }
    | {
        kind: 'vulnerabilities';
        /**
         * Scope id forwarded to the findings table for cell actions.
         */
        scopeId: string;
      }
  );

const TEST_IDS = {
  alerts: ENTITY_ALERTS_DETAILS_VIEW_TEST_ID,
  misconfigurations: ENTITY_MISCONFIGURATIONS_DETAILS_VIEW_TEST_ID,
  vulnerabilities: ENTITY_VULNERABILITIES_DETAILS_VIEW_TEST_ID,
} as const;

/**
 * Chrome-free body of the entity findings flyouts (alerts, misconfigurations, vulnerabilities).
 * Wraps the corresponding CSP `*FindingsDetailsTable` so the v2 surface matches the legacy
 * left-panel content.
 *
 * Note: `VulnerabilitiesFindingsDetailsTable` accepts `identityField` while the other two accept
 * `field`. That divergence is hidden here — callers always pass `field`.
 */
export const EntityFindingsDetailsView: FC<EntityFindingsDetailsViewProps> = (props) => {
  const { field, value, entityId, entityType, kind } = props;

  return (
    <div data-test-subj={TEST_IDS[kind]}>
      {kind === 'alerts' && (
        <AlertsDetailsTable
          field={field}
          value={value}
          entityId={entityId}
          entityType={entityType}
          onAlertOpened={props.onAlertOpened}
        />
      )}
      {kind === 'misconfigurations' && (
        <MisconfigurationFindingsDetailsTable
          field={field}
          value={value}
          entityId={entityId}
          entityType={entityType}
          scopeId={props.scopeId}
        />
      )}
      {kind === 'vulnerabilities' && (
        <VulnerabilitiesFindingsDetailsTable
          identityField={field}
          value={value}
          entityId={entityId}
          entityType={entityType}
          scopeId={props.scopeId}
        />
      )}
    </div>
  );
};

EntityFindingsDetailsView.displayName = 'EntityFindingsDetailsView';
