/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';

const BANNER = i18n.translate('xpack.securitySolution.flyout.header.rulePreview.bannerLabel', {
  defaultMessage: 'Preview rule details',
});

export const RulePreviewBanner = memo(() => (
  <EuiFlexGroup
    justifyContent="center"
    css={css`
      padding: 4px;
      background-color: #fdf3d8;
    `}
  >
    <EuiFlexItem grow={false}>
      <EuiText color="#825803" size="xs">
        {BANNER}
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
));

RulePreviewBanner.displayName = 'RulePreviewBanner';
