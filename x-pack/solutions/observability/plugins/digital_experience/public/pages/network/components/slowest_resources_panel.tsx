/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { EmptyCellValue } from '@kbn/shared-ux-column-presets';
import type { SlowResource } from '../../../../common/types/network';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, NETWORK_EBT_ELEMENTS } from '../../../ebt_constants';
import { useFormatters } from '../../../hooks/use_formatters';
import { formatBytes } from '../../../utils/format_bytes';
import { formatDurationMs } from '../../../utils/format_duration';
import { badgeColumnPreset, metricColumnPreset } from '../../../utils/column_presets';
import { DataPanel } from '../../../components/data_panel';
import { TruncatedUrl } from '../../../components/truncated_url';

const TITLE = i18n.translate('xpack.digitalExperience.network.slowestResources.title', {
  defaultMessage: 'Slowest resources',
});

const SUBTITLE = i18n.translate('xpack.digitalExperience.network.slowestResources.subtitle', {
  defaultMessage:
    'The scripts, styles, images and fonts with the longest p75 load time, an approximate ranking. Render-blocking ones delay the first paint.',
});

const RESOURCE_LABEL = i18n.translate('xpack.digitalExperience.network.slowestResources.resource', {
  defaultMessage: 'Resource',
});

const TYPE_LABEL = i18n.translate('xpack.digitalExperience.network.slowestResources.type', {
  defaultMessage: 'Type',
});

const LOADS_LABEL = i18n.translate('xpack.digitalExperience.network.slowestResources.loads', {
  defaultMessage: 'Loads',
});

const DURATION_LABEL = i18n.translate('xpack.digitalExperience.network.slowestResources.duration', {
  defaultMessage: 'Duration (p75)',
});

const SIZE_LABEL = i18n.translate('xpack.digitalExperience.network.slowestResources.size', {
  defaultMessage: 'Transfer size (p75)',
});

const EMPTY_MESSAGE = i18n.translate('xpack.digitalExperience.network.slowestResources.empty', {
  defaultMessage: 'No scripts, styles, images or fonts loaded in this time range.',
});

const NO_RENDER_BLOCKING_MESSAGE = i18n.translate(
  'xpack.digitalExperience.network.slowestResources.noRenderBlocking',
  { defaultMessage: 'None of these resources is render-blocking.' }
);

/** Rows per page: the panel lists the 50 slowest. */
const PAGE_SIZE = 10;

const RENDER_BLOCKING_LABEL = i18n.translate(
  'xpack.digitalExperience.network.slowestResources.renderBlocking',
  { defaultMessage: 'Render-blocking' }
);

/** The resources with the longest load, flagging the ones that block rendering. */
export function SlowestResourcesPanel({
  resources,
  isLoading,
}: {
  resources: SlowResource[];
  isLoading: boolean;
}) {
  const { formatNumber } = useFormatters();
  // Filters the loaded rows in place, so the table never reloads or flickers.
  const [renderBlockingOnly, setRenderBlockingOnly] = useState(false);
  const items = renderBlockingOnly
    ? resources.filter(({ renderBlocking }) => {
        return renderBlocking;
      })
    : resources;

  const columns: Array<EuiBasicTableColumn<SlowResource>> = [
    {
      field: 'url',
      name: RESOURCE_LABEL,
      render: (url: string, { renderBlocking }) => {
        return (
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            className="eui-textTruncate"
          >
            <EuiFlexItem className="eui-textTruncate">
              <TruncatedUrl url={url} />
            </EuiFlexItem>
            {renderBlocking && (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color="warning"
                  iconType="warning"
                  data-test-subj="digitalExperienceNetworkRenderBlocking"
                >
                  {RENDER_BLOCKING_LABEL}
                </EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'initiatorType',
      name: TYPE_LABEL,
      ...badgeColumnPreset<SlowResource>(),
      render: (initiatorType: string | null) => {
        return initiatorType ? (
          <EuiBadge color="hollow">{initiatorType}</EuiBadge>
        ) : (
          <EmptyCellValue />
        );
      },
    },
    {
      field: 'count',
      name: LOADS_LABEL,
      sortable: true,
      ...metricColumnPreset<SlowResource>(),
      render: (count: number) => {
        return formatNumber(count);
      },
    },
    {
      field: 'p75Ms',
      name: DURATION_LABEL,
      sortable: true,
      ...metricColumnPreset<SlowResource>(),
      render: (p75Ms: number | null) => {
        return p75Ms === null ? <EmptyCellValue /> : formatDurationMs(p75Ms);
      },
    },
    {
      field: 'transferSizeP75Bytes',
      name: SIZE_LABEL,
      sortable: true,
      ...metricColumnPreset<SlowResource>(),
      render: (bytes: number | null) => {
        return bytes === null ? <EmptyCellValue /> : formatBytes(bytes);
      },
    },
  ];

  return (
    <DataPanel
      title={TITLE}
      subtitle={SUBTITLE}
      isLoading={isLoading}
      actions={
        <EuiFilterGroup>
          <EuiFilterButton
            isToggle
            isSelected={renderBlockingOnly}
            hasActiveFilters={renderBlockingOnly}
            onClick={() => {
              return setRenderBlockingOnly((current) => {
                return !current;
              });
            }}
            data-test-subj="digitalExperienceNetworkRenderBlockingFilter"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
              element: NETWORK_EBT_ELEMENTS.RENDER_BLOCKING_FILTER,
            })}
          >
            {RENDER_BLOCKING_LABEL}
          </EuiFilterButton>
        </EuiFilterGroup>
      }
      isEmpty={resources.length === 0}
      emptyMessage={EMPTY_MESSAGE}
      showInstrumentationDocs
      data-test-subj="digitalExperienceNetworkSlowestResources"
    >
      <EuiInMemoryTable<SlowResource>
        tableCaption={TITLE}
        items={items}
        columns={columns}
        rowHeader="url"
        sorting={{ sort: { field: 'p75Ms', direction: 'desc' } }}
        pagination={{ pageSize: PAGE_SIZE, showPerPageOptions: false }}
        noItemsMessage={NO_RENDER_BLOCKING_MESSAGE}
      />
    </DataPanel>
  );
}
