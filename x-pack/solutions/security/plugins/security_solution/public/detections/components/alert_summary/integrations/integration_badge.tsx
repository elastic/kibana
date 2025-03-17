/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { CardIcon } from '@kbn/fleet-plugin/public';
import { LAST_SYNCED } from './translations';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';

const MIN_WIDTH = 200;

export interface IntegrationProps {
  /**
   *
   */
  integration: PackageListItem;
  /**
   *
   */
  isLoading: boolean;
  /**
   *
   */
  lastActivity: number;
}

/**
 *
 */
export const IntegrationBadge = memo(
  ({ integration, isLoading, lastActivity }: IntegrationProps) => {
    const { euiTheme } = useEuiTheme();

    const icons = useMemo(
      () => (!integration.icons || !integration.icons.length ? [] : integration.icons),
      [integration]
    );

    return (
      <EuiPanel
        css={css`
          min-width: ${MIN_WIDTH}px;
        `}
        hasBorder={true}
        hasShadow={false}
        paddingSize="s"
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <CardIcon
              icons={icons}
              integrationName={integration.title}
              packageName={integration.name}
              size="xl"
              version={integration.version}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText
                  css={css`
                    font-weight: ${euiTheme.font.weight.medium};
                  `}
                  size="xs"
                >
                  {integration.title}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSkeletonText lines={1} size="xs" isLoading={isLoading}>
                  <EuiText size="xs" color="subdued">
                    {LAST_SYNCED}
                    <FormattedRelativePreferenceDate value={lastActivity} />
                  </EuiText>
                </EuiSkeletonText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);

IntegrationBadge.displayName = 'IntegrationBadge';
