/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  withEuiTheme,
  WithEuiThemeProps,
  type EuiThemeComputed,
} from '@elastic/eui';
import React, { ReactNode } from 'react';
import { KubernetesTour } from './kubernetes_tour';

interface Props {
  'data-test-subj'?: string;
  label: string;
  onClick: () => void;
  children: ReactNode;
  showKubernetesInfo?: boolean;
}

type PropsWithTheme = Props & WithEuiThemeProps;

const ButtonLabel = ({ label, theme }: { label: string; theme?: EuiThemeComputed }) => (
  <EuiFlexItem
    grow={false}
    style={{
      padding: 12,
      background: theme?.colors.backgroundBaseFormsPrepend,
      fontSize: '0.75em',
      fontWeight: 600,
      color: theme?.colors.textHeading,
    }}
  >
    {label}
  </EuiFlexItem>
);

export const DropdownButton = withEuiTheme((props: PropsWithTheme) => {
  const { onClick, label, theme, children, showKubernetesInfo } = props;
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      style={{
        border: theme?.euiTheme.border.thin,
      }}
    >
      {showKubernetesInfo ? (
        <KubernetesTour>
          <ButtonLabel label={label} theme={theme.euiTheme} />
        </KubernetesTour>
      ) : (
        <ButtonLabel label={label} theme={theme.euiTheme} />
      )}
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          data-test-subj={props['data-test-subj']}
          color="text"
          iconType="arrowDown"
          onClick={onClick}
          iconSide="right"
          size="xs"
        >
          {children}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
