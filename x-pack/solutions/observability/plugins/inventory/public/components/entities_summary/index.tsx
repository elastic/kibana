/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';

export function EntitiesSummary({
  totalEntities,
  totalGroups,
}: {
  totalEntities?: number;
  totalGroups?: number;
}) {
  const { euiTheme } = useEuiTheme();

  const isGrouped = totalGroups !== undefined;

  return (
    <EuiFlexGroup
      gutterSize="none"
      css={css`
        font-weight: ${euiTheme.font.weight.semiBold};
      `}
    >
      {totalEntities !== undefined && (
        <EuiFlexItem grow={false}>
          <span
            data-test-subj="inventorySummaryEntitiesTotal"
            css={css`
              border-right: ${isGrouped ? euiTheme.border.thin : 'none'};
              margin-right: ${euiTheme.size.base};
              padding-right: ${euiTheme.size.base};
            `}
          >
            <FormattedMessage
              id="xpack.inventory.groupedInventoryPage.entitiesTotalLabel"
              defaultMessage="{total} Entities"
              values={{ total: totalEntities }}
            />
          </span>
        </EuiFlexItem>
      )}
      {isGrouped ? (
        <EuiFlexItem grow={false}>
          <span data-test-subj="inventorySummaryGroupsTotal">
            <FormattedMessage
              id="xpack.inventory.groupedInventoryPage.groupsTotalLabel"
              defaultMessage="{total} Groups"
              values={{ total: totalGroups }}
            />
          </span>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
