/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiCard, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { EuiCardProps } from '@elastic/eui/src/components/card/card';

interface ResponsiveDataCardsProps {
  /**
   * An array of EuiCardProps objects, defining the cards to be displayed.
   */
  cards: Array<Pick<EuiCardProps, 'title' | 'description'>>;
  /**
   * The width (in pixels) at which the cards should collapse from a row layout to two columns layout.
   * Defaults to 750.
   */
  collapseWidth?: number;
}

/**
 * A component that displays a group of data cards in a responsive layout.
 * Depending on the width of the container, the cards will be displayed in a row layout or a two columns layout.
 */
export const ResponsiveDataCards = ({ cards, collapseWidth = 750 }: ResponsiveDataCardsProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      css={css`
        container-type: inline-size;
      `}
      gutterSize="s"
      responsive={false}
      wrap
    >
      {cards.map((card, index) => (
        <EuiFlexItem
          key={index}
          css={css`
            flex-basis: calc(25% - ${euiTheme.size.s});
            width: calc(25% - ${euiTheme.size.s});

            @container (max-width: ${collapseWidth}px) {
              flex: calc(50% - ${euiTheme.size.s});
              width: calc(50% - ${euiTheme.size.s});
            }
          `}
        >
          <EuiCard
            data-test-subj="responsive-data-card"
            title={card.title}
            description={card.description}
            textAlign="left"
            titleSize="xs"
            hasBorder
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
