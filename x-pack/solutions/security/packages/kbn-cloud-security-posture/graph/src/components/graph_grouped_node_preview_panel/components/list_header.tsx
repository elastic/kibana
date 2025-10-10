/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { i18nNamespaceKey } from '../constants';

export interface ListHeaderProps {
  groupedItemsType: string;
}

export const ListHeader = ({ groupedItemsType }: ListHeaderProps) => {
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
        {i18n.translate(`${i18nNamespaceKey}.groupedTypes`, {
          defaultMessage: 'Grouped {types}',
          values: { types: groupedItemsType.toLowerCase() },
        })}
      </EuiText>
    </div>
  );
};
