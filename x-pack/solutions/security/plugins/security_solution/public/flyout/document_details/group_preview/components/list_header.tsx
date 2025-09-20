/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const ungroupAll = i18n.translate('xpack.securitySolution.flyout.groupPreview.ungroupAllBtn', {
  defaultMessage: 'Ungroup all',
});

export interface ListHeaderProps {
  artifactType: string;
}

export const ListHeader = ({ artifactType }: ListHeaderProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        display: flex;
        justify-content: space-between;
        align-items: center;
      `}
    >
      <EuiText
        size="m"
        color="default"
        css={css`
          font-weight: ${euiTheme.font.weight.medium};
        `}
      >
        {i18n.translate('xpack.securitySolution.flyout.groupPreview.groupedTypes', {
          defaultMessage: 'Grouped {types}',
          values: { types: artifactType.toLowerCase() },
        })}
      </EuiText>
      <EuiButtonEmpty
        iconType="branch"
        iconSide="left"
        size="s"
        color="primary"
        onClick={() => {
          // TODO Implement "ungroup all" logic
          // onUngroupAll()
        }}
      >
        {ungroupAll}
      </EuiButtonEmpty>
    </div>
  );
};
