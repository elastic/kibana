/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiPanel, EuiSelectableOption, EuiText } from '@elastic/eui';
import { EuiSelectableOptionCheckedType } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useGetSettings } from '../../slo_settings/hooks/use_get_settings';
import type { SearchState } from '../hooks/use_url_search_state';
import type { Option } from './slo_context_menu';
import { ContextMenuItem, SLOContextMenu } from './slo_context_menu';
import type { GroupByField } from '../types';

export interface Props {
  onStateChange: (newState: Partial<SearchState>) => void;
  state: SearchState;
  loading: boolean;
}

export type Item<T> = EuiSelectableOption & {
  label: string;
  type: T;
  checked?: EuiSelectableOptionCheckedType;
};

export function SloGroupBy({ onStateChange, state, loading }: Props) {
  const [isGroupByPopoverOpen, setIsGroupByPopoverOpen] = useState(false);
  const groupBy = state.groupBy;

  const { data: settings } = useGetSettings();

  const hasRemoteEnabled =
    settings && (settings.useAllRemoteClusters || settings.selectedRemoteClusters.length > 0);

  const handleChangeGroupBy = (value: GroupByField) => {
    onStateChange({
      page: 0,
      groupBy: value,
    });
  };
  const groupByOptions: Option[] = [
    {
      label: NONE_LABEL,
      checked: groupBy === 'ungrouped',
      value: 'ungrouped',
      onClick: () => {
        handleChangeGroupBy('ungrouped');
      },
    },
    {
      label: i18n.translate('xpack.slo.list.groupBy.tags', {
        defaultMessage: 'Tags',
      }),
      checked: groupBy === 'slo.tags',
      value: 'slo.tags',
      onClick: () => {
        handleChangeGroupBy('slo.tags');
      },
    },
    {
      label: i18n.translate('xpack.slo.list.groupBy.status', {
        defaultMessage: 'Status',
      }),
      checked: groupBy === 'status',
      value: 'status',
      onClick: () => {
        handleChangeGroupBy('status');
      },
    },
    {
      label: i18n.translate('xpack.slo.list.groupBy.sliType', {
        defaultMessage: 'SLI type',
      }),
      checked: groupBy === 'slo.indicator.type',
      value: 'slo.indicator.type',
      onClick: () => {
        handleChangeGroupBy('slo.indicator.type');
      },
    },
    {
      label: i18n.translate('xpack.slo.list.groupBy.sloId', {
        defaultMessage: 'SLO definition id',
      }),
      checked: groupBy === 'slo.id',
      value: 'slo.id',
      onClick: () => {
        handleChangeGroupBy('slo.id');
      },
    },
    {
      label: i18n.translate('xpack.slo.list.groupBy.sloInstanceId', {
        defaultMessage: 'SLO instance id',
      }),
      checked: groupBy === 'slo.instanceId',
      value: 'slo.instanceId',
      onClick: () => {
        handleChangeGroupBy('slo.instanceId');
      },
    },
  ];

  if (hasRemoteEnabled) {
    groupByOptions.push({
      label: i18n.translate('xpack.slo.list.groupBy.remoteCluster', {
        defaultMessage: 'Remote cluster',
      }),
      checked: groupBy === '_index',
      value: '_index',
      onClick: () => {
        handleChangeGroupBy('_index');
      },
    });
  }

  const items = [
    <EuiPanel paddingSize="s" hasShadow={false} key="group_title_panel">
      <EuiText size="xs">
        <h4>{GROUP_TITLE}</h4>
      </EuiText>
    </EuiPanel>,

    ...groupByOptions.map((option) => (
      <ContextMenuItem
        option={option}
        onClosePopover={() => setIsGroupByPopoverOpen(false)}
        key={option.value}
      />
    )),
  ];

  return (
    <SLOContextMenu
      items={items}
      id="groupBy"
      selected={groupByOptions.find((option) => option.value === groupBy)?.label || NONE_LABEL}
      isPopoverOpen={isGroupByPopoverOpen}
      setIsPopoverOpen={setIsGroupByPopoverOpen}
      label={GROUP_TITLE}
      loading={loading}
    />
  );
}

export const NONE_LABEL = i18n.translate('xpack.slo.list.groupBy.sliIndicator', {
  defaultMessage: 'None',
});
export const GROUP_TITLE = i18n.translate('xpack.slo.groupPopover.group.title', {
  defaultMessage: 'Group by',
});
