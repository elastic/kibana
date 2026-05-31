/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { GateStatusFilter } from '../lib/pipeline_filters';

interface PipelineToolbarProps {
  readonly roadmapId: string;
  readonly search: string;
  readonly gateStatus: GateStatusFilter;
  readonly roadmapTabs: ReadonlyArray<{ id: string; label: string }>;
  readonly expandAll: boolean;
  readonly onRoadmapChange: (roadmapId: string) => void;
  readonly onSearchChange: (search: string) => void;
  readonly onGateStatusChange: (gateStatus: GateStatusFilter) => void;
  readonly onToggleExpandAll: () => void;
}

export const PipelineToolbar = ({
  roadmapId,
  search,
  gateStatus,
  roadmapTabs,
  expandAll,
  onRoadmapChange,
  onSearchChange,
  onGateStatusChange,
  onToggleExpandAll,
}: PipelineToolbarProps) => {
  const roadmapOptions = [
    {
      id: '',
      label: i18n.translate('xpack.sdlcIntel.pipeline.toolbar.allRoadmaps', {
        defaultMessage: 'All',
      }),
    },
    ...roadmapTabs.map((tab) => ({
      id: tab.id,
      label: tab.label,
    })),
  ];

  return (
    <EuiFlexGroup alignItems="flexEnd" gutterSize="s" responsive wrap>
      <EuiFlexItem grow={2}>
        <EuiFormRow
          label={i18n.translate('xpack.sdlcIntel.pipeline.toolbar.roadmapLabel', {
            defaultMessage: 'Roadmap',
          })}
          display="rowCompressed"
          fullWidth
        >
          <EuiButtonGroup
            legend={i18n.translate('xpack.sdlcIntel.pipeline.toolbar.roadmapLegend', {
              defaultMessage: 'Filter by roadmap',
            })}
            options={roadmapOptions}
            idSelected={roadmapId}
            onChange={(id) => onRoadmapChange(id)}
            isFullWidth
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ minWidth: 180 }}>
        <EuiFormRow
          label={i18n.translate('xpack.sdlcIntel.pipeline.toolbar.statusLabel', {
            defaultMessage: 'Gate status',
          })}
          display="rowCompressed"
          fullWidth
        >
          <EuiSelect
            fullWidth
            value={gateStatus}
            onChange={(event) => onGateStatusChange(event.target.value as GateStatusFilter)}
            options={[
              {
                value: 'all',
                text: i18n.translate('xpack.sdlcIntel.pipeline.toolbar.allStatuses', {
                  defaultMessage: 'All statuses',
                }),
              },
              {
                value: 'fail',
                text: i18n.translate('xpack.sdlcIntel.pipeline.toolbar.blockedOnly', {
                  defaultMessage: 'Blocked only',
                }),
              },
              {
                value: 'warn',
                text: i18n.translate('xpack.sdlcIntel.pipeline.toolbar.atRiskOnly', {
                  defaultMessage: 'At risk only',
                }),
              },
              {
                value: 'pass',
                text: i18n.translate('xpack.sdlcIntel.pipeline.toolbar.passedOnly', {
                  defaultMessage: 'Passed only',
                }),
              },
            ]}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ minWidth: 180 }}>
        <EuiFormRow
          label={i18n.translate('xpack.sdlcIntel.pipeline.toolbar.searchLabel', {
            defaultMessage: 'Search',
          })}
          display="rowCompressed"
          fullWidth
        >
          <EuiFieldSearch
            fullWidth
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={i18n.translate('xpack.sdlcIntel.pipeline.toolbar.searchPlaceholder', {
              defaultMessage: 'Search epics…',
            })}
            isClearable
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" onClick={onToggleExpandAll}>
          {expandAll ? (
            <FormattedMessage
              id="xpack.sdlcIntel.pipeline.toolbar.collapseAll"
              defaultMessage="Collapse all"
            />
          ) : (
            <FormattedMessage
              id="xpack.sdlcIntel.pipeline.toolbar.expandAll"
              defaultMessage="Expand all"
            />
          )}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
