/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiCopy,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLink,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiToolTip,
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
  DETONATION_DURATION_MS,
  isDetonationDone,
  usePendingDetonations,
} from '../../../flyout_v2/detonation/pending_detonations';
import type {
  DetonationOrigin,
  DetonationRow,
  DetonationStatus,
  DetonationVerdict,
} from './detonation_rows';
import { DETONATION_ROWS } from './detonation_rows';
import * as i18n from './translations';

export const DETONATE_PAGE_TEST_ID = 'detonatePage';

const VERDICT_COLOR: Record<DetonationVerdict, string> = {
  Malicious: 'danger',
  Suspicious: 'warning',
  Benign: 'success',
};

const STATUS_LABEL: Record<DetonationStatus, string> = {
  queued: i18n.STATUS_QUEUED,
  in_progress: i18n.STATUS_IN_PROGRESS,
  complete: i18n.STATUS_COMPLETE,
  error: i18n.STATUS_ERROR,
};

const isRunning = (row: DetonationRow) => row.status === 'queued' || row.status === 'in_progress';

/** Truncated hash with a copy icon that appears on hover. */
const HashCell = memo(({ hash }: { hash: string }) => (
  <div
    css={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      maxWidth: 190,
      '.detonateHashCopy': { opacity: 0 },
      '&:hover .detonateHashCopy, &:focus-within .detonateHashCopy': { opacity: 1 },
    }}
    data-test-subj="detonateHashCell"
  >
    <EuiText
      size="xs"
      title={hash}
      css={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontFamily: 'monospace',
      }}
    >
      {hash}
    </EuiText>
    <EuiCopy textToCopy={hash}>
      {(copy) => (
        <EuiToolTip content={i18n.COPY_HASH} disableScreenReaderOutput>
          <EuiButtonIcon
            className="detonateHashCopy"
            iconType="copyClipboard"
            size="xs"
            color="text"
            aria-label={i18n.COPY_HASH}
            onClick={copy}
            data-test-subj="detonateHashCopy"
          />
        </EuiToolTip>
      )}
    </EuiCopy>
  </div>
));
HashCell.displayName = 'HashCell';

const StatusCell = memo(({ row }: { row: DetonationRow }) => {
  if (row.status === 'in_progress') {
    const progress = row.progress ?? 0;
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        data-test-subj="detonateStatusProgress"
      >
        <EuiFlexItem grow={false} css={{ width: 110 }}>
          <EuiProgress
            size="s"
            color="primary"
            value={progress}
            max={100}
            aria-label={i18n.STATUS_IN_PROGRESS}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">{`${Math.round(progress)}%`}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  const color =
    row.status === 'complete' ? 'success' : row.status === 'error' ? 'danger' : 'subdued';
  return (
    <EuiHealth color={color} data-test-subj={`detonateStatus-${row.status}`}>
      {STATUS_LABEL[row.status]}
    </EuiHealth>
  );
});
StatusCell.displayName = 'StatusCell';

export const DetonatePage = memo(() => {
  const { openDetonationFlyout } = useFlyoutApi();
  const { application } = useKibana().services;
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pendingDetonations = usePendingDetonations();
  const [now, setNow] = useState(() => Date.now());

  // Keep the progress bars of running detonations moving.
  const hasRunning = pendingDetonations.some((d) => !isDetonationDone(d, now));
  useEffect(() => {
    if (!hasRunning) {
      return undefined;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasRunning]);

  // Detonations submitted from alerts come first. They show a progress bar until their (fake)
  // verdict is ready.
  const rows = useMemo<DetonationRow[]>(
    () => [
      ...pendingDetonations.map<DetonationRow>((detonation) => {
        const isDone = isDetonationDone(detonation, now);
        const elapsed = now - new Date(detonation.submittedAt).getTime();
        return {
          id: detonation.id,
          fileName: detonation.fileName,
          sha256: detonation.sha256,
          environment: 'Windows 11 x64',
          submitted: detonation.submittedAt,
          origin: 'manual',
          status: isDone ? 'complete' : 'in_progress',
          progress: Math.min(99, (elapsed / DETONATION_DURATION_MS) * 100),
          ...(isDone ? { verdict: 'Malicious', score: 92 } : {}),
        };
      }),
      ...DETONATION_ROWS,
    ],
    [pendingDetonations, now]
  );

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return rows;
    }
    return rows.filter((row) =>
      [
        row.fileName,
        row.sha256,
        row.environment,
        row.verdict ?? '',
        STATUS_LABEL[row.status],
        row.origin === 'auto' ? i18n.ORIGIN_AUTO : i18n.ORIGIN_MANUAL,
      ].some((value) => value.toLowerCase().includes(term))
    );
  }, [rows, searchTerm]);

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
          row.status !== 'complete' ? (
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
        field: 'sha256',
        name: i18n.COLUMN_HASH,
        width: '210px',
        render: (sha256: string) => <HashCell hash={sha256} />,
      },
      {
        field: 'verdict',
        name: i18n.COLUMN_VERDICT,
        render: (verdict: DetonationVerdict | undefined, row: DetonationRow) =>
          verdict ? (
            <EuiBadge color={VERDICT_COLOR[verdict]} data-test-subj="detonateVerdict">
              {`${verdict} · ${row.score ?? ''}`}
            </EuiBadge>
          ) : (
            '—'
          ),
      },
      {
        field: 'status',
        name: i18n.COLUMN_STATUS,
        render: (_status: DetonationStatus, row: DetonationRow) => <StatusCell row={row} />,
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
      { field: 'environment', name: i18n.COLUMN_ENVIRONMENT },
      {
        field: 'submitted',
        name: i18n.COLUMN_SUBMITTED,
        render: (submitted: string) => (
          <FormattedDate value={submitted} year="numeric" month="short" day="numeric" />
        ),
      },
      {
        name: i18n.COLUMN_ACTIONS,
        width: '100px',
        actions: [
          {
            name: i18n.ACTION_VIEW_REPORT,
            description: i18n.ACTION_VIEW_REPORT_DESCRIPTION,
            icon: 'eye',
            type: 'icon',
            enabled: (row: DetonationRow) => row.status === 'complete',
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
            enabled: (row: DetonationRow) => !isRunning(row),
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
      <EuiFieldSearch
        fullWidth
        isClearable
        placeholder={i18n.SEARCH_PLACEHOLDER}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        aria-label={i18n.SEARCH_PLACEHOLDER}
        data-test-subj="detonateSearch"
      />
      <EuiSpacer size="m" />
      <EuiBasicTable
        tableCaption={i18n.TABLE_CAPTION}
        items={filteredRows}
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
