/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WithEuiThemeProps } from '@elastic/eui';
import {
  withEuiTheme,
  EuiFormControlLayout,
  EuiFormControlButton,
  EuiFormPrepend,
} from '@elastic/eui';
import React from 'react';
import type { ReactNode } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { KubernetesTour } from './kubernetes_tour';

interface Props {
  'data-test-subj'?: string;
  label: string;
  onClick: () => void;
  children: ReactNode;
  showKubernetesInfo?: boolean;
}

type PropsWithTheme = Props & WithEuiThemeProps;

export const DropdownButton = withEuiTheme((props: PropsWithTheme) => {
  const { onClick, label, children, showKubernetesInfo } = props;

  const styles = useMemoCss(dropdownButtonStyles);

  return (
    <EuiFormControlLayout
      compressed
      isDropdown
      prepend={
        showKubernetesInfo ? (
          <KubernetesTour>
            <EuiFormPrepend label={label} />
          </KubernetesTour>
        ) : (
          label
        )
      }
      css={styles.dropdownButton}
    >
      <EuiFormControlButton
        compressed
        onClick={onClick}
        aria-label={i18n.translate('xpack.infra.dropdownButton.button.ariaLabel', {
          defaultMessage: '{label} options',
          values: { label },
        })}
        data-test-subj={props['data-test-subj']}
      >
        {children}
      </EuiFormControlButton>
    </EuiFormControlLayout>
  );
});

const dropdownButtonStyles = {
  dropdownButton: css({
    '.euiFormControlLayout__prepend': {
      maxInlineSize: '100%',
    },
  }),
};
