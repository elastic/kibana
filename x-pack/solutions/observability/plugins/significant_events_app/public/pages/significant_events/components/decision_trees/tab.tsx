/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { FormattedMessage } from '@kbn/i18n-react';
import { DecisionTreeHome } from './home';
import { DecisionTreeSidebar, type DecisionTreeSidebarSelection } from './sidebar';
import { TreeView } from './tree_view';
import type { DecisionTreeStatusFilter } from './types';
import { useDecisionTrees } from './use_decision_trees';

export function DecisionTreesTab() {
  const { euiTheme } = useEuiTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DecisionTreeStatusFilter>('all');
  const [selection, setSelection] = useState<DecisionTreeSidebarSelection>({ kind: 'home' });
  const { data, isLoading, isError } = useDecisionTrees();

  if (isLoading) {
    return <EuiLoadingSpinner size="xl" data-test-subj="nightshiftDecisionTreesLoading" />;
  }

  if (isError) {
    return (
      <EuiEmptyPrompt
        iconType="alert"
        title={
          <h2>
            <FormattedMessage
              id="xpack.significantEventsApp.decisionTrees.loadErrorTitle"
              defaultMessage="Could not load decision trees"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.significantEventsApp.decisionTrees.loadErrorDescription"
              defaultMessage="The decision trees could not be loaded. Confirm Nightshift investigations are enabled and refresh the page."
            />
          </p>
        }
      />
    );
  }

  const trees = data?.trees ?? [];
  const stats = data?.stats ?? { total: 0, established: 0, total_versions: 0 };

  return (
    <EuiFlexGroup
      gutterSize="l"
      alignItems="stretch"
      className={css`
        min-height: 520px;
        height: calc(100vh - 220px);
      `}
      data-test-subj="nightshiftDecisionTreesTab"
    >
      <EuiFlexItem
        grow={false}
        className={css`
          width: 280px;
        `}
      >
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="m"
          className={css`
            height: 100%;
            min-height: 0;
            overflow: hidden;
          `}
        >
          <DecisionTreeSidebar
            trees={trees}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            selection={selection}
            onSelect={setSelection}
          />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel
          hasBorder
          hasShadow={false}
          paddingSize="none"
          className={css`
            height: 100%;
            min-height: 0;
            overflow: hidden;
          `}
        >
          <div
            className={css`
              height: 100%;
              min-height: 0;
              overflow-y: auto;
              padding: ${euiTheme.size.l};
            `}
          >
            {selection.kind === 'home' && (
              <DecisionTreeHome
                trees={trees}
                stats={stats}
                onSelectTree={(symptom) => setSelection({ kind: 'tree', symptom })}
              />
            )}
            {selection.kind === 'tree' && <TreeView symptom={selection.symptom} />}
          </div>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
