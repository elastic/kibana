/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import * as i18n from './translations';

const PageTitleComponent: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiTitle
      css={css`
        margin-bottom: ${euiTheme.size.s};
      `}
      data-test-subj="attackDiscoveryPageTitle"
      size="l"
    >
      <h1>{i18n.ATTACK_DISCOVERY_PAGE_TITLE}</h1>
    </EuiTitle>
  );
};

PageTitleComponent.displayName = 'PageTitle';

export const PageTitle = React.memo(PageTitleComponent);
