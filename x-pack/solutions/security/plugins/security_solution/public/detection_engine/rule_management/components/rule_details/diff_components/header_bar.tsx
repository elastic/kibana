/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiHorizontalRule,
  EuiIconTip,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/css';
import * as i18n from '../json_diff/translations';

export const RuleDiffHeaderBar = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        position: sticky;
        top: 0;
        background: ${euiTheme.colors.emptyShade};
        z-index: 1; // Fixes accordion button displaying above header bug
      `}
    >
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexGroup alignItems="baseline" gutterSize="xs">
          <EuiIconTip
            color="subdued"
            content={i18n.CURRENT_VERSION_DESCRIPTION}
            type="iInCircle"
            size="m"
            display="block"
          />
          <EuiTitle size="xxs">
            <h6>{i18n.CURRENT_RULE_VERSION}</h6>
          </EuiTitle>
        </EuiFlexGroup>
        <EuiFlexGroup alignItems="baseline" gutterSize="xs">
          <EuiIconTip
            color="subdued"
            content={i18n.UPDATED_VERSION_DESCRIPTION}
            type="iInCircle"
            size="m"
          />
          <EuiTitle size="xxs">
            <h6>{i18n.ELASTIC_UPDATE_VERSION}</h6>
          </EuiTitle>
        </EuiFlexGroup>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="s" size="full" />
    </div>
  );
};
