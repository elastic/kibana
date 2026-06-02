/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBasicTable, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import type { CompositeSLOMemberSummary } from '@kbn/slo-schema';
import React, { lazy, Suspense, useMemo, useState } from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import {
  SloBurnRateWindowColumnHeader,
  type SloBurnRateWindow,
} from '../common/slo_burn_rate_window_column_header';
import { MemberStatusBadge } from './composite_slo_member_status_badge';

const SLODetailsFlyout = lazy(
  () => import('../../../slo_details/shared_flyout/slo_details_flyout')
);

function getMemberBurnRateValue(
  item: CompositeSLOMemberSummary,
  window: SloBurnRateWindow
): number | undefined {
  const map = {
    '5m': item.fiveMinuteBurnRate,
    '1h': item.oneHourBurnRate,
    '1d': item.oneDayBurnRate,
  } as const;
  return map[window];
}

const getMemberColumns = (
  percentFormat: string,
  burnRateWindow: SloBurnRateWindow,
  setBurnRateWindow: (w: SloBurnRateWindow) => void,
  isBurnRatePopoverOpen: boolean,
  setIsBurnRatePopoverOpen: React.Dispatch<React.SetStateAction<boolean>>
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
    render: (status: CompositeSLOMemberSummary['status']) => <MemberStatusBadge status={status} />,
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
      defaultMessage: 'Normalized weight',
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
    field: 'errorBudget.remaining',
    name: i18n.translate('xpack.slo.compositeSloList.members.budgetRemaining', {
      defaultMessage: 'Budget remaining',
    }),
    width: '130px',
    render: (_: unknown, item: CompositeSLOMemberSummary) => {
      if (item.status === 'NO_DATA') {
        return NOT_AVAILABLE_LABEL;
      }
      if (item.errorBudget === undefined) {
        return NOT_AVAILABLE_LABEL;
      }
      return numeral(item.errorBudget.remaining).format(percentFormat);
    },
  },
  {
    name: (
      <SloBurnRateWindowColumnHeader
        burnRateWindow={burnRateWindow}
        onBurnRateWindowChange={setBurnRateWindow}
        isPopoverOpen={isBurnRatePopoverOpen}
        setIsPopoverOpen={setIsBurnRatePopoverOpen}
        buttonTestSubj="compositeSloMembersBurnRateWindowSelector"
        popoverAriaLabel={i18n.translate(
          'xpack.slo.compositeSloList.members.burnRate.windowAriaLabel',
          {
            defaultMessage: 'Select burn rate window for member SLOs',
          }
        )}
        burnRateLabel={i18n.translate('xpack.slo.compositeSloList.members.burnRateColumn', {
          defaultMessage: 'Burn rate',
        })}
      />
    ),
    width: '130px',
    render: (item: CompositeSLOMemberSummary) => {
      if (item.status === 'NO_DATA') {
        return NOT_AVAILABLE_LABEL;
      }
      const windowValue = getMemberBurnRateValue(item, burnRateWindow);
      if (windowValue === undefined) {
        return NOT_AVAILABLE_LABEL;
      }
      return <EuiText size="s">{`${numeral(windowValue).format('0.[00]')}x`}</EuiText>;
    },
  },
];

export function CompositeSloMembersTable({
  members,
  percentFormat,
}: {
  members: CompositeSLOMemberSummary[];
  percentFormat: string;
}) {
  const [burnRateWindow, setBurnRateWindow] = useState<SloBurnRateWindow>('5m');
  const [isBurnRatePopoverOpen, setIsBurnRatePopoverOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<CompositeSLOMemberSummary | null>(null);

  const columns = useMemo(
    () =>
      getMemberColumns(
        percentFormat,
        burnRateWindow,
        setBurnRateWindow,
        isBurnRatePopoverOpen,
        setIsBurnRatePopoverOpen
      ),
    [percentFormat, burnRateWindow, isBurnRatePopoverOpen]
  );

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
