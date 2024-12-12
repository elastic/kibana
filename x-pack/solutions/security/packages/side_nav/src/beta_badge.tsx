/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiBetaBadge, useEuiTheme } from '@elastic/eui';

export const BETA_LABEL = i18n.translate('securitySolutionPackages.sideNav.betaBadge.label', {
  defaultMessage: 'Beta',
});

export const BetaBadge = ({ text, className }: { text?: string; className?: string }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiBetaBadge
      label={text ?? BETA_LABEL}
      size="s"
      css={css`
        margin-left: ${euiTheme.size.s};
        color: ${euiTheme.colors.text};
        vertical-align: middle;
        margin-bottom: ${euiTheme.size.xxs};
      `}
      className={className}
    />
  );
};
