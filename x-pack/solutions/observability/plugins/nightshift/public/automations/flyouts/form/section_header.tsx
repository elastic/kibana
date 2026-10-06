/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const editLabel = i18n.translate('xpack.nightshift.automations.detail.edit', {
  defaultMessage: 'Edit',
});

export const SectionHeader = ({
  title,
  titleAppend,
  onEdit,
}: {
  title: string;
  titleAppend?: React.ReactNode;
  onEdit?: () => void;
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} css={{ minBlockSize: 32 }}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xs">
        <h3>{title}</h3>
      </EuiTitle>
    </EuiFlexItem>
    {titleAppend && <EuiFlexItem grow={false}>{titleAppend}</EuiFlexItem>}
    <EuiFlexItem />
    {onEdit && (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={editLabel} position="left" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="pencil"
            size="s"
            color="text"
            aria-label={editLabel}
            onClick={onEdit}
            data-test-subj="automationSectionEdit"
          />
        </EuiToolTip>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

export const FormSection = ({ children }: { children: React.ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <section
      css={{
        paddingBlock: euiTheme.size.s,
        border: `${euiTheme.border.width.thin} solid transparent`,
      }}
    >
      {children}
    </section>
  );
};
