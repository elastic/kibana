/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

interface RuleDetailsStickyHeaderProps {
  children: React.ReactNode;
}

/**
 * Pins the AppHeader and the search bar below it together while the page scrolls. The AppHeader
 * inside must be rendered with `sticky={false}`, and this container must be a direct child of a
 * container as tall as the page, otherwise CSS sticky is confined to the parent's height. The top
 * offset compensates the AppHeader's `largeBleed` negative top margin, which pulls it above this box.
 */
export const RuleDetailsStickyHeader = React.memo<RuleDetailsStickyHeaderProps>(({ children }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      data-test-subj="ruleDetailsStickyHeader"
      css={css`
        position: sticky;
        top: ${euiTheme.size.l};
        z-index: ${euiTheme.levels.mask};
        background-color: ${euiTheme.colors.backgroundBasePlain};
      `}
    >
      {children}
    </div>
  );
});

RuleDetailsStickyHeader.displayName = 'RuleDetailsStickyHeader';
