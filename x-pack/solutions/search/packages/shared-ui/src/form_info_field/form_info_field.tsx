/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface FormInfoFieldProps {
  actions?: React.ReactNode[];
  label?: string;
  value: string;
  copyValue?: string;
  dataTestSubj?: string;
  copyValueDataTestSubj?: string;
  maxWidth?: number;
  minWidth?: number;
}

export const FormInfoField: React.FC<FormInfoFieldProps> = ({
  actions = [],
  label,
  value,
  copyValue,
  dataTestSubj,
  copyValueDataTestSubj,
  maxWidth,
  minWidth,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      wrap
      style={{
        maxWidth: maxWidth ? `${maxWidth}px` : undefined,
        minWidth: minWidth ? `${minWidth}px` : undefined,
      }}
    >
      {label && (
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <span>{label}</span>
          </EuiTitle>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false} style={{ flexBasis: 'content', maxWidth: '100%' }}>
        <EuiFlexGroup
          style={{
            color: euiTheme.colors.textParagraph,
            backgroundColor: euiTheme.colors.backgroundBaseSubdued,
            borderRadius: euiTheme.border.radius.small,
          }}
          alignItems="center"
          gutterSize="xs"
          responsive={false}
        >
          <EuiFlexItem css={{ minWidth: 0 }} grow={false}>
            <code
              data-test-subj={dataTestSubj}
              style={{
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                fontSize: euiTheme.size.m,
                padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
              }}
            >
              {value}
            </code>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy
              textToCopy={copyValue ?? value}
              afterMessage={i18n.translate('xpack.searchSharedUI.formInfoField.copyAfterMessage', {
                defaultMessage: 'Copied',
              })}
            >
              {(copy) => (
                <EuiButtonIcon
                  size="s"
                  display="empty"
                  onClick={copy}
                  iconType="copy"
                  color="text"
                  data-test-subj={copyValueDataTestSubj}
                  aria-label={i18n.translate('xpack.searchSharedUI.formInfoField.copyAriaLabel', {
                    defaultMessage: 'Copy to clipboard',
                  })}
                />
              )}
            </EuiCopy>
          </EuiFlexItem>
          {actions.map((action, index) => (
            <EuiFlexItem key={index} grow={false}>
              {action}
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
