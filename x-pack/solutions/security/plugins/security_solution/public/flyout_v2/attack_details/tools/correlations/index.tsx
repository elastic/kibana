/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ToolsFlyoutHeader } from '../../../shared/components/tools_flyout_header';
import { ATTACK_CORRELATIONS_FLYOUT_TEST_ID } from '../../main/constants/test_ids';
import { AttackRelatedAlertsDetails } from './components/attack_related_alerts_details';

const TITLE = i18n.translate(
  'xpack.securitySolution.flyout.attackDetails.attackCorrelations.title',
  {
    defaultMessage: 'Correlations',
  }
);

export interface AttackCorrelationsProps {
  /**
   * The attack-discovery alert document this child flyout is opened from.
   * Threaded through to {@link AttackRelatedAlertsDetails} so the
   * `useOriginalAlertIds` hook can derive `originalAlertIds` directly from
   * `hit.flattened`.
   */
  hit: DataTableRecord;
  /**
   * Callback invoked when the preview button on an alert row is clicked.
   * Mirrors the `onShowAlert` callback wired by the canonical correlations
   * flyout — the v2 wiring opens the alert in a child document flyout via
   * `overlays.openSystemFlyout(<DocumentFlyoutWrapper .../>)`.
   */
  onShowAlert: (id: string, indexName: string) => void;
}

/**
 * Attack-specific Correlations child flyout opened from the v2 attack
 * details Insights → Correlation section. Renders the same content as the
 * legacy left-panel Correlation sub-tab — the related-alerts-by-ancestry
 * table only — wrapped in a v2 tools-flyout shell.
 *
 * Strict legacy parity: this flyout does not include the broader correlation
 * sections (cases, ancestry from same source, session, related attacks, …)
 * that live in the generic `flyout_v2/correlations/CorrelationsDetails`.
 */
export const AttackCorrelations: FC<AttackCorrelationsProps> = memo(({ hit, onShowAlert }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiFlyoutHeader
        hasBorder
        css={css`
          padding-block: ${euiTheme.size.s} !important;
        `}
        data-test-subj={ATTACK_CORRELATIONS_FLYOUT_TEST_ID}
      >
        <ToolsFlyoutHeader hit={hit} title={TITLE} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <AttackRelatedAlertsDetails hit={hit} onShowAlert={onShowAlert} />
      </EuiFlyoutBody>
    </>
  );
});

AttackCorrelations.displayName = 'AttackCorrelations';
