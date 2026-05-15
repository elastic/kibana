/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { MisconfigurationFindingDetailFields } from '@kbn/cloud-security-posture';
import { EntityIdentifierFields, EntityType } from '../../../../../../common/entity_analytics/types';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { MISCONFIGURATION_INSIGHTS_TOOL_TEST_ID } from './test_ids';
import { MisconfigurationFindingsDetailsTable } from '../../../../../cloud_security_posture/components/csp_details/misconfiguration_findings_details_table';

const MOCK_DATA: {
  rows: MisconfigurationFindingDetailFields[];
  passedFindings: number;
  failedFindings: number;
} = {
  rows: [
    {
      rule: { id: 'rule-1', name: 'Ensure SSH PermitEmptyPasswords is disabled' },
      resource: { id: 'resource-1', name: 'sshd_config', sub_type: 'config', type: 'file' },
      'result.evaluation': 'failed',
      'rule.name': 'Ensure SSH PermitEmptyPasswords is disabled',
    },
    {
      rule: { id: 'rule-2', name: 'Ensure /tmp is configured as a separate partition' },
      resource: { id: 'resource-2', name: '/etc/fstab', sub_type: 'file', type: 'filesystem' },
      'result.evaluation': 'passed',
      'rule.name': 'Ensure /tmp is configured as a separate partition',
    },
    {
      rule: { id: 'rule-3', name: 'Ensure firewall is active and enabled on boot' },
      resource: { id: 'resource-3', name: 'ufw', sub_type: 'service', type: 'process' },
      'result.evaluation': 'failed',
      'rule.name': 'Ensure firewall is active and enabled on boot',
    },
  ] as unknown as MisconfigurationFindingDetailFields[],
  passedFindings: 1,
  failedFindings: 2,
};

const TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.host.misconfigurationInsights.title',
  { defaultMessage: 'Misconfigurations' }
);

export interface MisconfigurationInsightsProps {
  /** The host name used to query misconfigurations (`host.name` field value). */
  value: string;
  /** Canonical Entity Store v2 id (`entity.id`) when already resolved. */
  entityId?: string;
  /** Scope id passed to downstream containers. */
  scopeId: string;
  /** Opens the originating host flyout as a child. */
  onOpenHost?: () => void;
}

export const MisconfigurationInsights = memo(
  ({ value, entityId, scopeId, onOpenHost }: MisconfigurationInsightsProps) => {
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
        <EuiFlyoutBody data-test-subj={MISCONFIGURATION_INSIGHTS_TOOL_TEST_ID}>
          <MisconfigurationFindingsDetailsTable
            field={EntityIdentifierFields.hostName}
            value={value}
            scopeId={scopeId}
            entityId={entityId}
            entityType={EntityType.host}
            mockData={MOCK_DATA}
          />
        </EuiFlyoutBody>
      </>
    );
  }
);

MisconfigurationInsights.displayName = 'MisconfigurationInsights';
