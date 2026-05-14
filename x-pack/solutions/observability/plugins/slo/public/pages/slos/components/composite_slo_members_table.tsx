/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBadge, EuiBasicTable, EuiLoadingSpinner, EuiToolTip } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import type { CompositeSLOMemberSummary } from '@kbn/slo-schema';
import React, { lazy, Suspense, useMemo, useState } from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { displayStatus } from '../../../components/slo/slo_badges/slo_status_badge';

const SLODetailsFlyout = lazy(() => import('../../slo_details/shared_flyout/slo_details_flyout'));

function MemberStatusBadge({ status }: { status: CompositeSLOMemberSummary['status'] }) {
  const statusInfo = displayStatus[status];
  if (!statusInfo) {
    return <>{NOT_AVAILABLE_LABEL}</>;
  }
  if (status === 'NO_DATA') {
    return (
      <EuiToolTip
        position="top"
        content={i18n.translate('xpack.slo.compositeSloList.members.statusNoDataTooltip', {
          defaultMessage:
            'It may take some time before the data is aggregated and available for this member SLO.',
        })}
      >
        <EuiBadge tabIndex={0} color={statusInfo.badgeColor}>
          {statusInfo.displayText}
        </EuiBadge>
      </EuiToolTip>
    );
  }
  return <EuiBadge color={statusInfo.badgeColor}>{statusInfo.displayText}</EuiBadge>;
}

const getMemberColumns = (
  percentFormat: string
): Array<EuiBasicTableColumn<CompositeSLOMemberSummary>> => [
  {
    field: 'name',
    name: i18n.translate('xpack.slo.compositeSloList.members.name', {
      defaultMessage: 'Member SLO',
    }),
    truncateText: true,
    width: '220px',
  },
  {
    field: 'status',
    name: i18n.translate('xpack.slo.compositeSloList.members.status', {
      defaultMessage: 'Status',
    }),
    width: '110px',
    render: (status: CompositeSLOMemberSummary['status']) => (
      <MemberStatusBadge status={status} />
    ),
  },
  {
    field: 'instanceId',
    name: i18n.translate('xpack.slo.compositeSloList.members.instanceId', {
      defaultMessage: 'Instance',
    }),
    width: '220px',
    render: (instanceId?: string) => instanceId ?? NOT_AVAILABLE_LABEL,
  },
  {
    field: 'weight',
    name: i18n.translate('xpack.slo.compositeSloList.members.weight', {
      defaultMessage: 'Weight',
    }),
    width: '80px',
  },
  {
    field: 'normalisedWeight',
    name: i18n.translate('xpack.slo.compositeSloList.members.normalisedWeight', {
      defaultMessage: 'Normalised weight',
    }),
    width: '140px',
    render: (value: number) =>
      value === -1 ? NOT_AVAILABLE_LABEL : numeral(value).format(percentFormat),
  },
  {
    field: 'sliValue',
    name: i18n.translate('xpack.slo.compositeSloList.members.sliValue', {
      defaultMessage: 'SLI value',
    }),
    width: '100px',
    render: (value: number) =>
      value === -1 ? NOT_AVAILABLE_LABEL : numeral(value).format(percentFormat),
  },
  {
    field: 'contribution',
    name: i18n.translate('xpack.slo.compositeSloList.members.contribution', {
      defaultMessage: 'Contribution',
    }),
    width: '110px',
    render: (value: number) =>
      value === -1 ? NOT_AVAILABLE_LABEL : numeral(value).format(percentFormat),
  },
];

export function CompositeSloMembersTable({
  members,
  percentFormat,
}: {
  members: CompositeSLOMemberSummary[];
  percentFormat: string;
}) {
  const columns = useMemo(() => getMemberColumns(percentFormat), [percentFormat]);
  const [selectedMember, setSelectedMember] = useState<CompositeSLOMemberSummary | null>(null);

  return (
    <div css={{ padding: '16px' }}>
      <EuiBasicTable
        tableCaption={i18n.translate('xpack.slo.compositeSloList.members.tableCaption', {
          defaultMessage: 'Member SLOs',
        })}
        data-test-subj="compositeSloMembersTable"
        items={members}
        columns={columns}
        itemId="id"
        compressed
        rowProps={(item: CompositeSLOMemberSummary) => ({
          onClick: () => setSelectedMember(item),
          style: { cursor: 'pointer' },
        })}
      />
      {selectedMember && (
        <Suspense fallback={<EuiLoadingSpinner size="m" />}>
          <SLODetailsFlyout
            sloId={selectedMember.id}
            sloInstanceId={selectedMember.instanceId}
            onClose={() => setSelectedMember(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
