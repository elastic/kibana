/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useGlobalFullScreen } from '../../../../common/containers/use_full_screen';

const STICKY_KQL_HEADER_ID = 'securitySolutionStickyKQL';

interface RuleDetailsStickyHeaderProps {
  children: React.ReactNode;
}

/** Height of the global KQL bar, which is pinned above the page content (0 when it is empty). */
const useStickyKqlHeaderHeight = (): number => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const element = document.getElementById(STICKY_KQL_HEADER_ID);
    if (!element) return;

    setHeight(element.offsetHeight);
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return height;
};

/**
 * Pins the whole AppHeader (title, badges, metadata and tabs) below the global KQL bar while the page
 * scrolls. The AppHeader inside must be rendered with `sticky={false}`, and this container must be a
 * direct child of a container as tall as the page, otherwise CSS sticky is confined to the parent's
 * height. The top offset compensates the AppHeader's `largeBleed` negative top margin, which pulls it
 * above this box. The box is hidden, but stays mounted, while the page is in global full screen mode.
 */
export const RuleDetailsStickyHeader = React.memo<RuleDetailsStickyHeaderProps>(({ children }) => {
  const { euiTheme } = useEuiTheme();
  const kqlHeaderHeight = useStickyKqlHeaderHeight();
  const { globalFullScreen } = useGlobalFullScreen();

  return (
    <div
      data-test-subj="ruleDetailsStickyHeader"
      css={css`
        display: ${globalFullScreen ? 'none' : 'block'};
        position: sticky;
        top: calc(
          var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0px)) + ${kqlHeaderHeight}px +
            ${euiTheme.size.l}
        );
        z-index: ${euiTheme.levels.mask};
        background-color: ${euiTheme.colors.backgroundBasePlain};
      `}
    >
      {children}
    </div>
  );
});

RuleDetailsStickyHeader.displayName = 'RuleDetailsStickyHeader';
