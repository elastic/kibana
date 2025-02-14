/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  isEmbedded?: boolean;
}

export function EmptyFunctionsMessage({ isEmbedded }: Props) {
  return (
    <EuiTitle
      css={css`
        position: absolute;
        top: ${isEmbedded ? '120%' : '10%'};
        left: 45%;
      `}
      size="s"
    >
      <EuiText>
        {i18n.translate('xpack.profiling.topNFunctionsGrid.noFunctionsFoundTextLabel', {
          defaultMessage: 'No functions found',
        })}
      </EuiText>
    </EuiTitle>
  );
}
