/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText } from '@elastic/eui';
import type { AnalyticsUseCase, AnalyticsUseCaseId } from '../../types';
import type { AnalyticsPageId } from './page_ids';
import { getPageTelemetryId, getPageTestSubj } from './page_ids';
import { selectedTile, tile, tileTitle } from './shared_styles';

interface UseCaseTilesProps {
  page: AnalyticsPageId;
  useCases: readonly AnalyticsUseCase[];
  selectedUseCaseId: AnalyticsUseCaseId | undefined;
  onSelectUseCase: (id: AnalyticsUseCaseId) => void;
}

/** Compact selectable tiles for the use cases. */
export const UseCaseTiles = ({
  page,
  useCases,
  selectedUseCaseId,
  onSelectUseCase,
}: UseCaseTilesProps): React.JSX.Element => (
  <EuiFlexGrid columns={3} gutterSize="s">
    {useCases.map(({ id, title, iconType }) => {
      const isSelected = id === selectedUseCaseId;
      return (
        <EuiFlexItem key={id}>
          <EuiPanel
            hasBorder
            paddingSize="s"
            color={isSelected ? 'primary' : 'plain'}
            css={isSelected ? selectedTile : tile}
            onClick={() => onSelectUseCase(id)}
            aria-pressed={isSelected}
            data-test-subj={getPageTestSubj(page, `UseCase-${id}`)}
            data-telemetry-id={getPageTelemetryId(page, `useCase-${id}`)}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type={iconType} size="m" aria-hidden />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" css={tileTitle}>
                  {title}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      );
    })}
  </EuiFlexGrid>
);
