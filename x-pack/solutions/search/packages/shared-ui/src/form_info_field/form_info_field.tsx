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
}

export const FormInfoField: React.FC<FormInfoFieldProps> = ({
  actions = [],
  label,
  value,
  copyValue,
  dataTestSubj,
  copyValueDataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {label && (
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <h1>{label}</h1>
          </EuiTitle>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false} css={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
        <code
          data-test-subj={dataTestSubj}
          style={{
            color: euiTheme.colors.textParagraph,
            padding: `${euiTheme.size.s} ${euiTheme.size.m}`,
            backgroundColor: euiTheme.colors.backgroundBaseSubdued,
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            borderRadius: euiTheme.border.radius.small,
            fontSize: euiTheme.size.m,
          }}
        >
          {value}
        </code>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy
          textToCopy={copyValue ?? value}
          afterMessage={i18n.translate('xpack.searchSharedUI.formInfoField.copyMessage', {
            defaultMessage: 'Copied',
          })}
        >
          {(copy) => (
            <EuiButtonIcon
              size="s"
              display="base"
              onClick={copy}
              iconType="copy"
              color="text"
              data-test-subj={copyValueDataTestSubj}
              aria-label={i18n.translate('xpack.searchSharedUI.formInfoField.copyMessage', {
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
  );
};
