/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { AppHeaderProps } from '@kbn/app-header';
import { FormattedDate } from '@kbn/i18n-react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { SecuritySolutionPageWrapper } from '../../../common/components/page_wrapper';
import { SecurityAppHeader } from '../../../common/components/app_header';
import { APP_UI_ID, SecurityPageName } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { DetonateSubmitModal } from '../../../flyout_v2/detonation/submit_modal';
import {
  isDetonationDone,
  usePendingDetonations,
} from '../../../flyout_v2/detonation/pending_detonations';
import type { DetonationOrigin, DetonationRow, DetonationVerdict } from './detonation_rows';
import { DETONATION_ROWS } from './detonation_rows';
import * as i18n from './translations';

export const DETONATE_PAGE_TEST_ID = 'detonatePage';

const VERDICT_COLOR: Record<DetonationVerdict, string> = {
  Malicious: 'danger',
  Suspicious: 'warning',
  Benign: 'success',
};

export const DetonatePage = memo(() => {
  const { openDetonationFlyout } = useFlyoutApi();
  const { application } = useKibana().services;
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const pendingDetonations = usePendingDetonations();

  // Detonations submitted from alerts come first: they spin until their (fake) verdict is ready.
  const rows = useMemo<DetonationRow[]>(
    () => [
      ...pendingDetonations.map<DetonationRow>((detonation) => {
        const isPending = !isDetonationDone(detonation);
        return {
          id: detonation.id,
          fileName: detonation.fileName,
          hostName: detonation.hostName,
          submitted: detonation.submittedAt,
          origin: 'manual',
          isPending,
          ...(isPending ? {} : { verdict: 'Malicious', score: 92 }),
        };
      }),
      ...DETONATION_ROWS,
    ],
    [pendingDetonations]
  );

  const handleSubmit = useCallback(() => {
    setIsSubmitModalOpen(false);
    openDetonationFlyout();
  }, [openDetonationFlyout]);

  const appMenu = useMemo<AppHeaderProps['menu']>(
    () => ({
      primaryActionItem: {
        id: 'detonateSubmitFileUrl',
        label: i18n.SUBMIT_FILE_URL,
        iconType: 'plus',
        run: () => setIsSubmitModalOpen(true),
        testId: 'detonateSubmitFileUrl',
      },
      items: [],
    }),
    []
  );

  const columns = useMemo<Array<EuiBasicTableColumn<DetonationRow>>>(
    () => [
      {
        field: 'fileName',
        name: i18n.COLUMN_FILE,
        render: (fileName: string, row: DetonationRow) =>
          row.isPending ? (
            <EuiText size="s">{fileName}</EuiText>
          ) : (
            <EuiLink
              onClick={() => openDetonationFlyout({ skipDetonation: true })}
              data-test-subj="detonateRowLink"
            >
              {fileName}
            </EuiLink>
          ),
      },
      {
        field: 'verdict',
        name: i18n.COLUMN_VERDICT,
        render: (verdict: DetonationVerdict | undefined, row: DetonationRow) =>
          row.isPending || !verdict ? (
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              data-test-subj="detonateRowPending"
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {i18n.DETONATING}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiBadge color={VERDICT_COLOR[verdict]}>{verdict}</EuiBadge>
          ),
      },
      {
        field: 'score',
        name: i18n.COLUMN_SCORE,
        render: (score: number | undefined, row: DetonationRow) =>
          row.isPending || score == null ? '—' : score,
      },
      {
        field: 'origin',
        name: i18n.COLUMN_DETONATION,
        render: (origin: DetonationOrigin) => (
          <EuiBadge
            color="hollow"
            iconType={origin === 'auto' ? 'bolt' : 'user'}
            data-test-subj={`detonateOrigin-${origin}`}
          >
            {origin === 'auto' ? i18n.ORIGIN_AUTO : i18n.ORIGIN_MANUAL}
          </EuiBadge>
        ),
      },
      { field: 'hostName', name: i18n.COLUMN_HOST },
      {
        field: 'submitted',
        name: i18n.COLUMN_SUBMITTED,
        render: (submitted: string) => (
          <FormattedDate value={submitted} year="numeric" month="short" day="numeric" />
        ),
      },
      { field: 'id', name: i18n.COLUMN_REPORT_ID },
      {
        name: i18n.COLUMN_ACTIONS,
        width: '100px',
        actions: [
          {
            name: i18n.ACTION_VIEW_REPORT,
            description: i18n.ACTION_VIEW_REPORT_DESCRIPTION,
            icon: 'eye',
            type: 'icon',
            enabled: (row: DetonationRow) => !row.isPending,
            onClick: () => openDetonationFlyout({ skipDetonation: true }),
            'data-test-subj': 'detonateActionViewReport',
          },
          {
            name: i18n.ACTION_VIEW_CASE,
            description: i18n.ACTION_VIEW_CASE_DESCRIPTION,
            icon: 'briefcase',
            type: 'icon',
            enabled: (row: DetonationRow) => Boolean(row.caseName),
            onClick: () =>
              application.navigateToApp(APP_UI_ID, { deepLinkId: SecurityPageName.case }),
            'data-test-subj': 'detonateActionViewCase',
          },
          {
            name: i18n.ACTION_REDETONATE,
            description: i18n.ACTION_REDETONATE_DESCRIPTION,
            icon: 'refresh',
            type: 'icon',
            enabled: (row: DetonationRow) => !row.isPending,
            onClick: () => openDetonationFlyout(),
            'data-test-subj': 'detonateActionRedetonate',
          },
        ],
      },
    ],
    [openDetonationFlyout, application]
  );

  return (
    <SecuritySolutionPageWrapper data-test-subj={DETONATE_PAGE_TEST_ID}>
      <SecurityAppHeader title={i18n.PAGE_TITLE} menu={appMenu} spacing="compact" />
      <EuiSpacer size="m" />
      <EuiBasicTable
        tableCaption={i18n.TABLE_CAPTION}
        items={rows}
        columns={columns}
        itemId="id"
        tableLayout="auto"
      />
      {isSubmitModalOpen && (
        <DetonateSubmitModal onClose={() => setIsSubmitModalOpen(false)} onSubmit={handleSubmit} />
      )}
    </SecuritySolutionPageWrapper>
  );
});

DetonatePage.displayName = 'DetonatePage';
