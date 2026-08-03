/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import type { ThreatCategory } from '../../../../common/threat_intelligence/hub';
import { getThreatCategoryLabel } from '../../../../common/threat_intelligence/hub';

const sizeCss = {
  sm: css({
    fontSize: '11px',
    lineHeight: '16px',
    padding: '2px 8px',
  }),
  md: css({
    fontSize: '12px',
    lineHeight: '18px',
    padding: '4px 10px',
  }),
};

/**
 * Monochrome category pill matching the Intelligence Hub prototype
 * (white fill, thin border, dark text). Colorful category styles are
 * intentionally not used on report cards.
 */
export const ThreatCategoryBadge: React.FC<{
  category: ThreatCategory | string;
  size?: 'sm' | 'md';
}> = ({ category, size = 'sm' }) => {
  const { euiTheme } = useEuiTheme();
  const label = getThreatCategoryLabel(category);
  const badgeCss = css({
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '9999px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    backgroundColor: euiTheme.colors.emptyShade,
    color: euiTheme.colors.textParagraph,
    border: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
  });

  return (
    <span css={[badgeCss, sizeCss[size]]} data-test-subj={`threatIntelCategoryBadge-${category}`}>
      {label}
    </span>
  );
};
