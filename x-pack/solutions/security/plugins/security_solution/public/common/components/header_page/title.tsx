/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge, EuiBadge, EuiTitle } from '@elastic/eui';
import styled from '@emotion/styled';

import type { BadgeOptions, TitleProp } from './types';
import { TruncatableText } from '../truncatable_text';

const Header = styled.h1`
  display: grid;
  grid-gap: 12px;
  grid-template-columns: auto auto;
  align-items: center;
  justify-items: start;
  justify-content: start;
`;
Header.displayName = 'Header';

const TitleWrapper = styled.span`
  // Without  min-width: 0, as a flex child, it wouldn't shrink properly
  // and could overflow its parent.
  min-width: 0;
  max-width: 100%;
`;
TitleWrapper.displayName = 'TitleWrapper';

interface Props {
  badgeOptions?: BadgeOptions;
  title: TitleProp;
}

const TitleComponent: React.FC<Props> = ({ title, badgeOptions }) => (
  <EuiTitle size="l">
    <Header data-test-subj="header-page-title">
      <TitleWrapper>
        <TruncatableText tooltipContent={typeof title === 'string' ? title : null}>
          {title}
        </TruncatableText>
      </TitleWrapper>
      {badgeOptions && (
        <>
          {badgeOptions.beta ? (
            <EuiBetaBadge
              label={badgeOptions.text}
              tooltipContent={badgeOptions.tooltip}
              tooltipPosition="bottom"
              size={badgeOptions.size}
            />
          ) : (
            <EuiBadge color={badgeOptions.color || 'hollow'} title="">
              {badgeOptions.text}
            </EuiBadge>
          )}
        </>
      )}
    </Header>
  </EuiTitle>
);

export const Title = React.memo(TitleComponent);
