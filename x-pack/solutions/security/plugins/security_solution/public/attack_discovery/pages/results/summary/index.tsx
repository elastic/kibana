/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSwitch, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { SelectedActions } from './selected_actions';
import { SummaryCount } from './summary_count';
import { SHOW_ANONYMIZED_LABEL } from '../../translations';

interface Props {
  alertsCount: number;
  attackDiscoveriesCount: number;
  isLoading?: boolean;
  lastUpdated: Date | null;
  onToggleShowAnonymized: () => void;
  refetchFindAttackDiscoveries?: () => void;
  selectedAttackDiscoveries: Record<string, boolean>;
  selectedConnectorAttackDiscoveries: AttackDiscoveryAlert[];
  setSelectedAttackDiscoveries: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  showAnonymized: boolean;
}

const SummaryComponent: React.FC<Props> = ({
  alertsCount,
  attackDiscoveriesCount,
  isLoading = false,
  lastUpdated,
  onToggleShowAnonymized,
  refetchFindAttackDiscoveries,
  selectedAttackDiscoveries,
  selectedConnectorAttackDiscoveries,
  setSelectedAttackDiscoveries,
  showAnonymized,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="summary"
      justifyContent="spaceBetween"
      responsive={false}
      wrap={false}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false} wrap={true}>
          <EuiFlexItem grow={false}>
            <SummaryCount
              alertsCount={alertsCount}
              attackDiscoveriesCount={attackDiscoveriesCount}
              lastUpdated={lastUpdated}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <SelectedActions
              refetchFindAttackDiscoveries={refetchFindAttackDiscoveries}
              selectedConnectorAttackDiscoveries={selectedConnectorAttackDiscoveries}
              selectedAttackDiscoveries={selectedAttackDiscoveries}
              setSelectedAttackDiscoveries={setSelectedAttackDiscoveries}
            />
          </EuiFlexItem>

          {isLoading && (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner
                css={css`
                  margin-left: ${euiTheme.size.s};
                `}
                size="s"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiSwitch
          checked={showAnonymized}
          compressed={true}
          data-test-subj="toggleAnonymized"
          label={SHOW_ANONYMIZED_LABEL}
          onChange={onToggleShowAnonymized}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SummaryComponent.displayName = 'Summary';

export const Summary = React.memo(SummaryComponent);
