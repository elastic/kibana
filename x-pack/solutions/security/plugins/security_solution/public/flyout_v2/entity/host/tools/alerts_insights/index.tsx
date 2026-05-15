/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EntityIdentifierFields, EntityType } from '../../../../../../common/entity_analytics/types';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { ALERTS_INSIGHTS_TOOL_TEST_ID } from './test_ids';
import { AlertsDetailsTable } from '../../../../../cloud_security_posture/components/csp_details/alerts_findings_details_table';

const TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.host.alertsInsights.title',
  { defaultMessage: 'Alerts' }
);

export interface AlertsInsightsProps {
  /** The host name used to query alerts (`host.name` field value). */
  value: string;
  /** Canonical Entity Store v2 id (`entity.id`) when already resolved. */
  entityId?: string;
  /** Opens the originating host flyout as a child. */
  onOpenHost?: () => void;
}

export const AlertsInsights = memo(({ value, entityId, onOpenHost }: AlertsInsightsProps) => {
  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <ToolsFlyoutHeader
          title={TITLE}
          onTitleClick={onOpenHost}
          label={value}
          iconType="storage"
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody data-test-subj={ALERTS_INSIGHTS_TOOL_TEST_ID}>
        <AlertsDetailsTable
          field={EntityIdentifierFields.hostName}
          value={value}
          entityId={entityId}
          entityType={EntityType.host}
        />
      </EuiFlyoutBody>
    </>
  );
});

AlertsInsights.displayName = 'AlertsInsights';
