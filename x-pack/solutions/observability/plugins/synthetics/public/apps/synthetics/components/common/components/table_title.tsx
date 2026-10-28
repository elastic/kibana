/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer, EuiHorizontalRule } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const TableTitle = ({
  pageIndex,
  pageSize,
  total,
  label,
  rightContent,
}: {
  pageIndex: number;
  pageSize: number;
  total: number;
  label: string;
  rightContent?: React.ReactNode;
}) => {
  const start = Math.min(pageIndex * pageSize + 1, total);
  const end = Math.min(start + pageSize - 1, total);
  return (
    <>
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            <FormattedMessage
              id="xpack.synthetics.tableTitle.showing"
              defaultMessage="Showing {count} of {total} {label}"
              values={{
                count: (
                  <strong>
                    {start}-{end}
                  </strong>
                ),
                total,
                label: <strong>{label}</strong>,
              }}
            />
          </EuiText>
        </EuiFlexItem>
        {rightContent ? <EuiFlexItem grow={false}>{rightContent}</EuiFlexItem> : null}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
    </>
  );
};
