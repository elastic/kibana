/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { css } from '@emotion/react';
import React from 'react';
import * as uuid from 'uuid';

import { TableId } from '@kbn/securitysolution-data-table';
import { DetectionEngineAlertsTable } from '../../../../detections/components/alerts_table';

interface Props {
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  size: number;
}

const AlertsPreviewComponent: React.FC<Props> = ({ query, size }) => {
  return (
    <div
      css={css`
        width: 100%;
      `}
      data-test-subj="alertsPreview"
    >
      <DetectionEngineAlertsTable
        // Show the same row-actions as in the case view
        tableType={TableId.alertsOnRuleDetailsPage}
        id={`attack-discovery-alerts-preview-${uuid.v4()}`}
        showAlertStatusWithFlapping={false}
        query={query}
        initialPageSize={size}
      />
    </div>
  );
};

export const AlertsPreview = React.memo(AlertsPreviewComponent);
