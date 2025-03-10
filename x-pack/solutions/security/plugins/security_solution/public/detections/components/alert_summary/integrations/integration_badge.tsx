/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CustomIntegration } from '@kbn/custom-integrations-plugin/public';
import type { PackageListItem } from '@kbn/fleet-plugin/common';
import { CardIcon } from '@kbn/fleet-plugin/public';
import { LAST_SYNCED } from './translations';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';

const MIN_WIDTH = 200;

export interface IntegrationProps {
  /**
   *
   */
  integration: CustomIntegration | PackageListItem;
}

/**
 *
 */
export const IntegrationBadge = memo(({ integration }: IntegrationProps) => {
  const { euiTheme } = useEuiTheme();

  const icons = useMemo(
    () => (!integration.icons || !integration.icons.length ? [] : integration.icons),
    [integration]
  );
  const packageName = useMemo(
    () => ('name' in integration ? integration.name : integration.id),
    [integration]
  );
  const integrationName = useMemo(
    () => ('integration' in integration ? integration.integration || '' : ''),
    [integration]
  );
  const version = useMemo(
    () => ('version' in integration ? integration.version || '' : ''),
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
            integrationName={integrationName}
            packageName={packageName}
            size="xl"
            version={version}
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
              <EuiText size="xs" color="subdued">
                {LAST_SYNCED}
                <FormattedRelativePreferenceDate value={new Date().getTime()} />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});

IntegrationBadge.displayName = 'IntegrationBadge';
