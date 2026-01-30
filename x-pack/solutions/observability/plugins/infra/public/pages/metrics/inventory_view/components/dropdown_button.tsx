/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WithEuiThemeProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  withEuiTheme,
  type EuiThemeComputed,
  EuiText,
} from '@elastic/eui';
import React from 'react';
import type { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
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
    css={{
      padding: 7,
      background: theme?.colors.backgroundBaseFormsPrepend,
      borderRight: theme?.border.thin,
    }}
  >
    <EuiText size="xs">
      <strong>{label}</strong>
    </EuiText>
  </EuiFlexItem>
);

export const DropdownButton = withEuiTheme((props: PropsWithTheme) => {
  const { onClick, label, theme, children, showKubernetesInfo } = props;
  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="none"
      css={{
        border: theme?.euiTheme.border.thin,
        borderRadius: theme?.euiTheme.border.radius.medium,
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
          aria-label={i18n.translate('xpack.infra.dropdownButton.button.ariaLabel', {
            defaultMessage: '{label} options',
            values: { label },
          })}
          data-test-subj={props['data-test-subj']}
          color="text"
          iconType="arrowDown"
          onClick={onClick}
          iconSide="right"
          size="xs"
          css={css`
            &::before {
              background: none !important;
            }
          `}
        >
          {children}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
