/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { MAX_LOADED_ROWS } from '../hooks/use_entity_grid_data';
import { useEntityGridView } from './entities_grid_view_context';

/** Rows per load: all the rows the grid shows, in one load. */
export const ROWS_PER_LOAD = MAX_LOADED_ROWS;

const LOAD_MORE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.loadMoreLabel',
  { defaultMessage: 'Load more' }
);

const getShownCountLabel = (shown: number, total: number) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.home.grid.getShownCountLabel', {
    defaultMessage: 'Showing {shown, number} of {total, number}',
    values: { shown, total },
  });

const LOAD_LIMIT_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.grid.loadLimitLabel',
  {
    defaultMessage:
      'The table shows up to {max, number} rows. Narrow the search or filters to see the others.',
    values: { max: MAX_LOADED_ROWS },
  }
);

/** Under the rows: how many are shown, and Load More while more can load. */
export const EntityGridLoadMore = () => {
  const { euiTheme } = useEuiTheme();
  const { rows, total, canLoadMore, isAtLoadLimit, isLoadingMore, loadMore } = useEntityGridView();
  if (!rows.length || (!canLoadMore && !isAtLoadLimit)) return null;
  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      gutterSize="s"
      css={css`
        padding: ${euiTheme.size.m};
      `}
    >
      <EuiText size="xs" color="subdued">
        {isAtLoadLimit ? LOAD_LIMIT_LABEL : getShownCountLabel(rows.length, total)}
      </EuiText>
      {canLoadMore && (
        <EuiButton size="s" onClick={loadMore} isLoading={isLoadingMore}>
          {LOAD_MORE_LABEL}
        </EuiButton>
      )}
    </EuiFlexGroup>
  );
};
