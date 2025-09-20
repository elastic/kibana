/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { EuiFieldSearch, EuiHorizontalRule, useEuiTheme, type CommonProps } from '@elastic/eui';
import { css } from '@emotion/react';
// import { i18n } from '@kbn/i18n';

export const SearchBar = (props: CommonProps & PropsWithChildren) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.m};
      `}
    >
      <EuiFieldSearch
        placeholder="Filter your data using KQL syntax"
        // TODO Implement "filtering" logic
        value={'Filter your data using KQL syntax'}
        // onChange={(e) => onChange(e)}
        isClearable={true}
        aria-label="Use aria labels when no actual label is in use"
      />
      <EuiHorizontalRule size="full" margin="none" />
    </div>
  );
};
