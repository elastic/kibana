/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DocumentToolsFlyoutHeader } from '../../../shared/components/document_tools_flyout_header';
import { CorrelationsDetailsAlertsTable } from '../../../document/tools/correlations/components/correlations_details_alerts_table';
import { getColumns } from '../../../document/tools/correlations/utils/get_columns';
import { ATTACK_CORRELATIONS_TABLE_TEST_ID, ATTACK_CORRELATIONS_TOOL_TEST_ID } from './test_ids';
import { ATTACK_CORRELATIONS_TITLE } from '../../../shared/constants/flyout_titles';

const noopShowAlert = (_id: string, _indexName: string, _title?: string) => {};

export interface CorrelationsDetailsProps {
  /**
   * The attack document hit. Used to derive the flyout header title and the eventId
   * passed to the correlated-alerts table.
   */
  hit: DataTableRecord;
  /**
   * De-obfuscated IDs of all alerts underlying this attack, computed by useAttackAlertIds.
   */
  alertIds: string[];
  /**
   * Optional callback to open the alert flyout as a child when the user clicks the
   * preview icon on a row in the correlated-alerts table. Defaults to a no-op.
   */
  onShowAlert?: (id: string, indexName: string, title?: string) => void;
}

/**
 * Attack Correlations tool flyout panel.
 * Displays all alerts related to an attack discovery, aggregated across the
 * attack's underlying alert IDs, using the same table as the document flyout's
 * Correlations tool.
 */
export const CorrelationsDetails = memo(
  ({ hit, alertIds, onShowAlert = noopShowAlert }: CorrelationsDetailsProps) => {
    const { euiTheme } = useEuiTheme();
    const eventId = hit.raw._id ?? '';

    const columns = useMemo(
      () =>
        getColumns({
          scopeId: '',
          dataTestSubj: ATTACK_CORRELATIONS_TABLE_TEST_ID,
          onShowAlert,
        }),
      [onShowAlert]
    );

    return (
      <>
        <EuiFlyoutHeader
          hasBorder
          css={css`
            padding-block: ${euiTheme.size.s} !important;
          `}
        >
          <DocumentToolsFlyoutHeader title={ATTACK_CORRELATIONS_TITLE} hit={hit} />
        </EuiFlyoutHeader>
        <EuiFlyoutBody data-test-subj={ATTACK_CORRELATIONS_TOOL_TEST_ID}>
          <CorrelationsDetailsAlertsTable
            title={
              <FormattedMessage
                id="xpack.securitySolution.flyoutV2.attack.tools.correlations.relatedAlertsTitle"
                defaultMessage="{count} {count, plural, one {alert} other {alerts}} related to this attack"
                values={{ count: alertIds.length }}
              />
            }
            loading={false}
            alertIds={alertIds}
            scopeId=""
            eventId={eventId}
            noItemsMessage={
              <FormattedMessage
                id="xpack.securitySolution.flyoutV2.attack.tools.correlations.noRelatedAlerts"
                defaultMessage="No related alerts."
              />
            }
            columns={columns}
            data-test-subj={ATTACK_CORRELATIONS_TABLE_TEST_ID}
          />
        </EuiFlyoutBody>
      </>
    );
  }
);

CorrelationsDetails.displayName = 'CorrelationsDetails';
