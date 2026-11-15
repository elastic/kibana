/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  useEuiFontSize,
  useEuiTheme,
  type EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AdditionalControls } from '../../entities_table/additional_controls';
import { LastUpdated } from '../../last_updated';
import { loadingPlaceholderCss } from './entities_grid_styles';

const RESOLVED_ROWS_TOTAL_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.resolvedRowsTotalTitle',
  { defaultMessage: 'resolved entities' }
);

const INDIVIDUAL_ROWS_TOTAL_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.individualRowsTotalTitle',
  { defaultMessage: 'entity records' }
);

interface EntityGridToolbarTotalProps {
  total?: number;
  shown?: number;
  isIndividualRows: boolean;
  visibleColumns: string[];
  onAddColumn: (columnId: string) => void;
  onRemoveColumn: (columnId: string) => void;
  onResetColumns: () => void;
}

const EntityGridToolbarTotal: React.FC<EntityGridToolbarTotalProps> = ({
  isIndividualRows,
  visibleColumns,
  ...controls
}) => {
  const { euiTheme } = useEuiTheme();
  const { fontSize, lineHeight } = useEuiFontSize('xs');
  return (
    <div
      css={css`
        .entityAnalyticsDataTableTotal {
          font-weight: ${euiTheme.font.weight.semiBold};
          font-size: ${fontSize};
          line-height: ${lineHeight};
          border-inline-end: ${euiTheme.border.thin};
          padding-inline-end: ${euiTheme.size.m};
          margin-inline-end: ${euiTheme.size.xs};
        }
        .entityAnalyticsDataTableTotalLoading {
          ${loadingPlaceholderCss};
          inline-size: 10em;
          block-size: ${lineHeight};
          border-radius: ${euiTheme.border.radius.small};
          background: ${euiTheme.colors.lightShade};
        }
      `}
    >
      <AdditionalControls
        {...controls}
        title={isIndividualRows ? INDIVIDUAL_ROWS_TOTAL_TITLE : RESOLVED_ROWS_TOTAL_TITLE}
        columns={visibleColumns}
      />
    </div>
  );
};

const EntityGridToolbarRight: React.FC<{
  updatedAt: number | null;
  controls: React.ReactNode;
}> = ({ updatedAt, controls }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.m};
      `}
    >
      {updatedAt != null && <LastUpdated updatedAt={updatedAt} />}
      {controls}
    </div>
  );
};

interface EntityGridToolbarOptions extends EntityGridToolbarTotalProps {
  updatedAt: number | null;
  controls: React.ReactNode;
}

export const getEntityGridToolbarVisibility = ({
  updatedAt,
  controls,
  ...totalProps
}: EntityGridToolbarOptions): EuiDataGridToolBarVisibilityOptions => ({
  showColumnSelector: true,
  showSortSelector: false,
  showDisplaySelector: true,
  showKeyboardShortcuts: true,
  additionalControls: {
    left: { prepend: <EntityGridToolbarTotal {...totalProps} /> },
    right: <EntityGridToolbarRight updatedAt={updatedAt} controls={controls} />,
  },
});
