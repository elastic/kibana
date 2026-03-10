/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiProgress,
  EuiFlexItem,
  EuiLoadingChart,
  useEuiTheme,
  EuiCodeBlock,
  EuiIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EmptyPlaceholder } from '@kbn/charts-plugin/public';
import { IconChartLine } from '@kbn/chart-icons';
import type { InfraHttpError } from '../../types';

export const ChartLoadingProgress = ({ hasTopMargin = false }: { hasTopMargin?: boolean }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiProgress
      size="xs"
      color="accent"
      position="absolute"
      css={css`
        top: ${hasTopMargin ? euiTheme.size.l : 0};
        z-index: ${Number(euiTheme.levels.header) - 1};
      `}
    />
  );
};

interface ChartPlaceholderProps {
  style?: React.CSSProperties;
  error?: InfraHttpError;
  isEmpty?: boolean;
}

export const ChartPlaceholder = ({ style, error, isEmpty }: ChartPlaceholderProps) => {
  if (error) {
    return (
      <>
        <EuiFlexGroup
          style={style}
          justifyContent="center"
          alignItems="center"
          responsive={false}
          direction="column"
        >
          <EuiFlexItem grow={false}>
            <EuiIcon type={'alert'} size="l" color={'danger'} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {error.message && (
              <EuiCodeBlock
                paddingSize="s"
                isCopyable
                css={css`
                  display: flex;
                  align-items: center;
                  justify-content: center;
                `}
              >
                {error.message}
              </EuiCodeBlock>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
  if (isEmpty) {
    return (
      <>
        <EmptyPlaceholder
          icon={IconChartLine}
          message={
            <FormattedMessage
              id="xpack.infra.lens.noResultsFound"
              defaultMessage="No results found"
            />
          }
        />
      </>
    );
  }
  return (
    <>
      <ChartLoadingProgress hasTopMargin={false} />
      <EuiFlexGroup style={style} justifyContent="center" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiLoadingChart size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
