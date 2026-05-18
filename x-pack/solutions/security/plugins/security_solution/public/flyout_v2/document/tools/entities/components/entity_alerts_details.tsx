/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { CloudPostureEntityIdentifier } from '../../../../../cloud_security_posture/components/entity_insight';
import { AlertsDetailsTable } from '../../../../../cloud_security_posture/components/csp_details/alerts_findings_details_table';
import { ENTITY_ALERTS_DETAILS_TEST_ID } from '../test_ids';

export interface EntityAlertsDetailsProps {
  title: string;
  field: CloudPostureEntityIdentifier;
  value: string;
  entityId?: string;
  entityType: 'host' | 'user';
  /** Open a specific alert's details. When provided, used instead of the expandable-flyout preview panel. */
  onShowAlert?: (id: string, indexName: string) => void;
}

export const EntityAlertsDetails = memo(
  ({ title, field, value, entityId, entityType, onShowAlert }: EntityAlertsDetailsProps) => {
    const { euiTheme } = useEuiTheme();

    return (
      <>
        <EuiFlyoutHeader
          hasBorder
          css={css`
            padding-block: ${euiTheme.size.s} !important;
          `}
        >
          <EuiTitle size="xs">
            <h4>{title}</h4>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <div data-test-subj={ENTITY_ALERTS_DETAILS_TEST_ID}>
            <AlertsDetailsTable
              field={field}
              value={value}
              entityId={entityId}
              entityType={entityType}
              onShowAlert={onShowAlert}
            />
          </div>
        </EuiFlyoutBody>
      </>
    );
  }
);

EntityAlertsDetails.displayName = 'EntityAlertsDetails';
