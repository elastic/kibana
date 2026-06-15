/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { GateStatusFilter } from '../lib/pipeline_filters';
import type { PipelineScope } from '../lib/pipeline_scope';

interface PipelineToolbarProps {
  readonly scope: PipelineScope;
  readonly orgTeamOptions: ReadonlyArray<{ value: string; text: string }>;
  readonly subteamOptions: ReadonlyArray<{ value: string; text: string }>;
  readonly productRoadmapOptions: ReadonlyArray<{ value: string; text: string }>;
  readonly search: string;
  readonly gateStatus: GateStatusFilter;
  readonly expandAll: boolean;
  readonly onOrgTeamChange: (orgTeamKey: string) => void;
  readonly onSubteamChange: (subteamKey: string) => void;
  readonly onProductRoadmapChange: (productRoadmapId: string) => void;
  readonly onSearchChange: (search: string) => void;
  readonly onGateStatusChange: (gateStatus: GateStatusFilter) => void;
  readonly onToggleExpandAll: () => void;
}

export const PipelineToolbar = ({
  scope,
  orgTeamOptions,
  subteamOptions,
  productRoadmapOptions,
  search,
  gateStatus,
  expandAll,
  onOrgTeamChange,
  onSubteamChange,
  onProductRoadmapChange,
  onSearchChange,
  onGateStatusChange,
  onToggleExpandAll,
}: PipelineToolbarProps) => (
  <>
    <EuiText size="xs" color="subdued">
      <FormattedMessage
        id="xpack.sdlcIntel.pipeline.toolbar.scopeHint"
        defaultMessage="Scope by Security org team and subteam, or filter to a product roadmap (Workflows, lifecycle platform). Epics roll up under teams—not individual epic titles."
      />
    </EuiText>
    <EuiFlexGroup alignItems="flexEnd" gutterSize="s" responsive wrap>
      <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
        <EuiFormRow
          label={i18n.translate('xpack.sdlcIntel.pipeline.toolbar.orgTeamLabel', {
            defaultMessage: 'Org team',
          })}
          display="rowCompressed"
          fullWidth
        >
          <EuiSelect
            fullWidth
            value={scope.orgTeamKey}
            onChange={(event) => onOrgTeamChange(event.target.value)}
            options={orgTeamOptions}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
        <EuiFormRow
          label={i18n.translate('xpack.sdlcIntel.pipeline.toolbar.subteamLabel', {
            defaultMessage: 'Subteam',
          })}
          display="rowCompressed"
          fullWidth
        >
          <EuiSelect
            fullWidth
            disabled={!scope.orgTeamKey}
            value={scope.subteamKey}
            onChange={(event) => onSubteamChange(event.target.value)}
            options={
              subteamOptions.length > 0
                ? subteamOptions
                : [
                    {
                      value: '',
                      text: i18n.translate('xpack.sdlcIntel.pipeline.toolbar.selectOrgTeamFirst', {
                        defaultMessage: 'Select an org team first',
                      }),
                    },
                  ]
            }
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={1} style={{ minWidth: 220 }}>
        <EuiFormRow
          label={i18n.translate('xpack.sdlcIntel.pipeline.toolbar.productRoadmapLabel', {
            defaultMessage: 'Product roadmap',
          })}
          display="rowCompressed"
          fullWidth
        >
          <EuiSelect
            fullWidth
            value={scope.productRoadmapId}
            onChange={(event) => onProductRoadmapChange(event.target.value)}
            options={productRoadmapOptions}
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
            defaultMessage: 'Search epics',
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
  </>
);
