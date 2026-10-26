/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiButton, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { TEST_SUBJ_EMPTY_STATE } from './constants';

export const EntitiesEmptyState = ({ onResetFilters }: { onResetFilters: () => void }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiEmptyPrompt
      css={css`
        max-width: 734px;
        && > .euiEmptyPrompt__main {
          gap: ${euiTheme.size.xl};
        }
        && {
          margin-top: ${euiTheme.size.xxxl}};
        }
      `}
      data-test-subj={TEST_SUBJ_EMPTY_STATE}
      title={
        <h2>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entitiesTable.emptyState.title"
            defaultMessage="No results match your search criteria"
          />
        </h2>
      }
      layout="horizontal"
      body={
        <p>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entitiesTable.emptyState.description"
            defaultMessage="Try modifying your search or filter set"
          />
        </p>
      }
      actions={[
        <EuiButton color="primary" fill onClick={onResetFilters}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entitiesTable.emptyState.resetFiltersButton"
            defaultMessage="Reset filters"
          />
        </EuiButton>,
      ]}
    />
  );
};
