/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EntityIdentifierFields } from '../../../../../../common/entity_analytics/types';
import { InsightsTabCsp } from '../../../../../cloud_security_posture/components/csp_details/insights_tab_csp';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { CSP_INSIGHTS_TOOL_TEST_ID } from './test_ids';

const TITLE = i18n.translate('xpack.securitySolution.flyout.entityDetails.host.cspInsights.title', {
  defaultMessage: 'Insights',
});

export interface CspInsightsProps {
  /** The host name used to query CSP findings (`host.name` field value). */
  value: string;
  /** Canonical Entity Store v2 id (`entity.id`) when already resolved. */
  entityId?: string;
  /** Scope id (timeline id, table id, etc.) passed to downstream containers. */
  scopeId: string;
  /** Entity type label forwarded to the CSP insights tab. */
  entityType?: string;
  /** Opens the originating host flyout as a child. */
  onOpenHost?: () => void;
}

export const CspInsights = memo(
  ({ value, entityId, scopeId, entityType, onOpenHost }: CspInsightsProps) => {
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
        <EuiFlyoutBody data-test-subj={CSP_INSIGHTS_TOOL_TEST_ID}>
          <InsightsTabCsp
            field={EntityIdentifierFields.hostName}
            value={value}
            scopeId={scopeId}
            entityId={entityId}
            entityType={entityType}
          />
        </EuiFlyoutBody>
      </>
    );
  }
);

CspInsights.displayName = 'CspInsights';
