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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoverageFilter, DeckBucketFilter } from '../lib/executive_filters';

interface ExecutiveToolbarProps {
  readonly search: string;
  readonly product: string;
  readonly owner: string;
  readonly coverage: CoverageFilter;
  readonly engineeringTeam: string;
  readonly deckBucket: DeckBucketFilter;
  readonly productOptions: readonly string[];
  readonly ownerOptions: readonly string[];
  readonly engineeringTeamOptions: readonly string[];
  readonly expandAll: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly onProductChange: (value: string) => void;
  readonly onOwnerChange: (value: string) => void;
  readonly onCoverageChange: (value: CoverageFilter) => void;
  readonly onEngineeringTeamChange: (value: string) => void;
  readonly onDeckBucketChange: (value: DeckBucketFilter) => void;
  readonly onToggleExpandAll: () => void;
}

export const ExecutiveToolbar = ({
  search,
  product,
  owner,
  coverage,
  engineeringTeam,
  deckBucket,
  productOptions,
  ownerOptions,
  engineeringTeamOptions,
  expandAll,
  onSearchChange,
  onProductChange,
  onOwnerChange,
  onCoverageChange,
  onEngineeringTeamChange,
  onDeckBucketChange,
  onToggleExpandAll,
}: ExecutiveToolbarProps) => (
  <EuiFlexGroup alignItems="flexEnd" gutterSize="s" responsive wrap>
    <EuiFlexItem grow={2} style={{ minWidth: 220 }}>
      <EuiFormRow
        label={i18n.translate('xpack.sdlcIntel.executive.toolbar.searchLabel', {
          defaultMessage: 'Search',
        })}
        display="rowCompressed"
        fullWidth
      >
        <EuiFieldSearch
          fullWidth
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={i18n.translate('xpack.sdlcIntel.executive.toolbar.searchPlaceholder', {
            defaultMessage: 'Search epics or tickets…',
          })}
          isClearable
        />
      </EuiFormRow>
    </EuiFlexItem>
    <EuiFlexItem grow={1} style={{ minWidth: 180 }}>
      <EuiFormRow
        label={i18n.translate('xpack.sdlcIntel.executive.toolbar.productLabel', {
          defaultMessage: 'Product',
        })}
        display="rowCompressed"
        fullWidth
      >
        <EuiSelect
          fullWidth
          value={product}
          onChange={(event) => onProductChange(event.target.value)}
          options={[
            {
              value: '',
              text: i18n.translate('xpack.sdlcIntel.executive.toolbar.allProducts', {
                defaultMessage: 'All products',
              }),
            },
            ...productOptions.map((option) => ({ value: option, text: option })),
          ]}
        />
      </EuiFormRow>
    </EuiFlexItem>
    <EuiFlexItem grow={1} style={{ minWidth: 180 }}>
      <EuiFormRow
        label={i18n.translate('xpack.sdlcIntel.executive.toolbar.engineeringTeamLabel', {
          defaultMessage: 'Engineering team',
        })}
        display="rowCompressed"
        fullWidth
      >
        <EuiSelect
          fullWidth
          value={engineeringTeam}
          onChange={(event) => onEngineeringTeamChange(event.target.value)}
          options={[
            {
              value: '',
              text: i18n.translate('xpack.sdlcIntel.executive.toolbar.allEngineeringTeams', {
                defaultMessage: 'All engineering teams',
              }),
            },
            ...engineeringTeamOptions.map((option) => ({ value: option, text: option })),
          ]}
        />
      </EuiFormRow>
    </EuiFlexItem>
    <EuiFlexItem grow={1} style={{ minWidth: 180 }}>
      <EuiFormRow
        label={i18n.translate('xpack.sdlcIntel.executive.toolbar.releaseCycleLabel', {
          defaultMessage: 'Release cycle',
        })}
        display="rowCompressed"
        fullWidth
      >
        <EuiSelect
          fullWidth
          value={deckBucket}
          onChange={(event) => onDeckBucketChange(event.target.value as DeckBucketFilter)}
          options={[
            {
              value: '',
              text: i18n.translate('xpack.sdlcIntel.executive.toolbar.allReleaseCycles', {
                defaultMessage: 'All release cycles',
              }),
            },
            {
              value: 'released_9_3',
              text: i18n.translate('xpack.sdlcIntel.executive.toolbar.released93', {
                defaultMessage: 'Released (9.3)',
              }),
            },
            {
              value: 'now',
              text: i18n.translate('xpack.sdlcIntel.executive.toolbar.deckNow', {
                defaultMessage: 'Now',
              }),
            },
            {
              value: 'next',
              text: i18n.translate('xpack.sdlcIntel.executive.toolbar.deckNext', {
                defaultMessage: 'Next',
              }),
            },
            {
              value: 'later',
              text: i18n.translate('xpack.sdlcIntel.executive.toolbar.deckLater', {
                defaultMessage: 'Later',
              }),
            },
          ]}
        />
      </EuiFormRow>
    </EuiFlexItem>
    <EuiFlexItem grow={1} style={{ minWidth: 180 }}>
      <EuiFormRow
        label={i18n.translate('xpack.sdlcIntel.executive.toolbar.ownerLabel', {
          defaultMessage: 'Owner',
        })}
        display="rowCompressed"
        fullWidth
      >
        <EuiSelect
          fullWidth
          value={owner}
          onChange={(event) => onOwnerChange(event.target.value)}
          options={[
            {
              value: '',
              text: i18n.translate('xpack.sdlcIntel.executive.toolbar.allOwners', {
                defaultMessage: 'All owners',
              }),
            },
            ...ownerOptions.map((option) => ({ value: option, text: option })),
          ]}
        />
      </EuiFormRow>
    </EuiFlexItem>
    <EuiFlexItem grow={1} style={{ minWidth: 180 }}>
      <EuiFormRow
        label={i18n.translate('xpack.sdlcIntel.executive.toolbar.coverageLabel', {
          defaultMessage: 'Coverage',
        })}
        display="rowCompressed"
        fullWidth
      >
        <EuiSelect
          fullWidth
          value={coverage}
          onChange={(event) => onCoverageChange(event.target.value as CoverageFilter)}
          options={[
            {
              value: '',
              text: i18n.translate('xpack.sdlcIntel.executive.toolbar.allCoverage', {
                defaultMessage: 'All coverage',
              }),
            },
            {
              value: 'risk',
              text: i18n.translate('xpack.sdlcIntel.executive.toolbar.coverageRisk', {
                defaultMessage: 'At risk (<30%)',
              }),
            },
            {
              value: 'amber',
              text: i18n.translate('xpack.sdlcIntel.executive.toolbar.coverageAmber', {
                defaultMessage: 'In progress (30–69%)',
              }),
            },
            {
              value: 'good',
              text: i18n.translate('xpack.sdlcIntel.executive.toolbar.coverageGood', {
                defaultMessage: 'On track (≥70%)',
              }),
            },
          ]}
        />
      </EuiFormRow>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButton size="s" onClick={onToggleExpandAll}>
        {expandAll ? (
          <FormattedMessage
            id="xpack.sdlcIntel.executive.toolbar.collapseAll"
            defaultMessage="Collapse all"
          />
        ) : (
          <FormattedMessage
            id="xpack.sdlcIntel.executive.toolbar.expandAll"
            defaultMessage="Expand all"
          />
        )}
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
