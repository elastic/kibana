/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import * as i18n from '../translations';

export const PageTitle: React.FC = React.memo(() => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      data-test-subj="pageTitle"
      gutterSize="none"
      responsive={false}
      wrap={true}
    >
      <EuiFlexItem grow={false}>
        <EuiTitle data-test-subj="siemMigrationsPageTitle" size="l">
          <h1>{i18n.PAGE_TITLE}</h1>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem
        css={css`
          margin: ${euiTheme.size.s} 0 0 ${euiTheme.size.m};
        `}
        grow={false}
      >
        <EuiBetaBadge
          iconType={'beaker'}
          label={i18n.BETA_LABEL}
          tooltipContent={i18n.BETA_TOOLTIP}
          size="m"
          color="hollow"
          css={css`
            .euiBetaBadge__icon {
              position: relative;
              top: 5px;
            }
          `}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
PageTitle.displayName = 'PageTitle';
