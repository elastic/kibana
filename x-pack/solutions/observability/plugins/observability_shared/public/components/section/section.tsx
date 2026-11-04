/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiListGroupItemProps } from '@elastic/eui';
import {
  EuiText,
  EuiListGroup,
  EuiSpacer,
  EuiListGroupItem,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React from 'react';
import styled from 'styled-components';
import type { EuiListGroupProps } from '@elastic/eui';

// Not a heading: popovers sit outside the page outline. Reference `id` from SectionLinks' aria-labelledby.
export function SectionTitle({ children, id }: { children?: ReactNode; id?: string }) {
  const { euiTheme } = useEuiTheme();
  const { fontSize, lineHeight } = useEuiFontSize('s', { customScale: 's' });

  return (
    <>
      <EuiText size={'s'} grow={false}>
        <div
          id={id}
          css={css`
            font-size: ${fontSize};
            line-height: ${lineHeight};
            font-weight: ${euiTheme.font.weight[euiTheme.font.title.weight]};
            letter-spacing: ${euiTheme.font.title.letterSpacing};
          `}
        >
          {children}
        </div>
      </EuiText>
      <EuiSpacer size={'xs'} />
    </>
  );
}

export function SectionSubtitle({ children }: { children?: ReactNode }) {
  return (
    <>
      <EuiText size={'xs'} color={'subdued'} grow={false}>
        <small>{children}</small>
      </EuiText>
      <EuiSpacer size={'s'} />
    </>
  );
}

export function SectionLinks({ children, ...props }: { children?: ReactNode } & EuiListGroupProps) {
  return (
    <EuiListGroup {...props} color={'primary'} bordered={false}>
      {children}
    </EuiListGroup>
  );
}

export function SectionSpacer() {
  return <EuiSpacer size={'l'} />;
}

export const Section = styled.div`
  margin-bottom: 16px;
  &:last-of-type {
    margin-bottom: 0;
  }
`;

export type SectionLinkProps = EuiListGroupItemProps;
export function SectionLink({ ...props }: SectionLinkProps) {
  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem>
        <EuiListGroupItem style={{ padding: 0 }} {...props} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
