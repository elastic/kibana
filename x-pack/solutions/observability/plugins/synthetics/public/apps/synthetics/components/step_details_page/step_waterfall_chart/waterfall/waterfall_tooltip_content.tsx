/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText, useEuiTheme } from '@elastic/eui';

import { css } from '@emotion/react';
import { useWaterfallContext } from './context/waterfall_context';

interface Props {
  text: string;
  url: string;
  index: number;
}

export const WaterfallTooltipContent: React.FC<Props> = ({ text, url, index }) => {
  const { renderTooltipItem, metadata } = useWaterfallContext();
  // the passed index is base 1, so we need to subtract 1 to get the correct index
  const metadataEntry = metadata?.[index - 1];
  const tooltipItems = metadataEntry?.networkItemTooltipProps;
  const showTooltip = metadataEntry?.showTooltip;

  const theme = useEuiTheme().euiTheme;

  if (!tooltipItems || !showTooltip) {
    return null;
  }

  return (
    <div style={{ maxWidth: 500, height: '100%' }}>
      <EuiText
        size="xs"
        css={css`
          font-weight: bold;
        `}
      >
        {text}
      </EuiText>
      <EuiHorizontalRule
        margin="none"
        css={css`
          background-color: ${theme.colors.darkShade};
        `}
      />
      <EuiFlexGroup direction="column" gutterSize="none">
        {tooltipItems.map((item, idx) => (
          <EuiFlexItem key={idx}>{renderTooltipItem(item)}</EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </div>
  );
};
