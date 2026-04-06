/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { NoResultsIllustration } from './no_results_illustration';

const heights = {
  tall: 490,
  short: 250,
};

export const TableContext = createContext<{ tableId: string | null }>({ tableId: null });

export const TableLoading: React.FC<{ height?: keyof typeof heights }> = ({ height = 'tall' }) => {
  return (
    <EuiPanel color="subdued">
      <EuiFlexGroup
        style={{ height: heights[height] }}
        alignItems="center"
        justifyContent="center"
        data-test-subj="loading-alerts-panel"
      >
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const panelStyle = {
  maxWidth: 500,
};

export const EmptyTable: React.FC = () => {
  return (
    <EuiPanel color="subdued" data-test-subj="tGridEmptyState">
      <EuiFlexGroup alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder={true} css={panelStyle}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiTitle>
                    <h3>
                      <FormattedMessage
                        id="xpack.securitySolution.eventsViewer.empty.title"
                        defaultMessage="No results match your search criteria"
                      />
                    </h3>
                  </EuiTitle>
                  <p>
                    <FormattedMessage
                      id="xpack.securitySolution.eventsViewer.empty.description"
                      defaultMessage="Try searching over a longer period of time or modifying your search"
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <NoResultsIllustration width={200} height={148} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
