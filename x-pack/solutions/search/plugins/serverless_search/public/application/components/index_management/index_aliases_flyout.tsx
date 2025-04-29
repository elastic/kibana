/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export interface IndexAliasesFlyoutProps {
  aliases: string[];
  indexName: string;
  onClose: () => void;
}

export const IndexAliasesFlyout = ({ indexName, aliases, onClose }: IndexAliasesFlyoutProps) => {
  const aliasItems = aliases.map((alias) => ({ name: alias }));
  const columns: Array<EuiBasicTableColumn<{ name: string }>> = [
    {
      field: 'name',
      name: i18n.translate(
        'xpack.serverlessSearch.indexManagement.indexDetails.overview.aliasesFlyout.table.nameColumn.header',
        { defaultMessage: 'Alias Name' }
      ),
      'data-test-subj': 'aliasNameCell',
      truncateText: false,
      width: '100%',
    },
  ];
  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="xpack.serverlessSearch.indexManagement.indexDetails.overview.aliasesFlyout.title"
              defaultMessage="{indexName} Aliases"
              values={{ indexName }}
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiBasicTable items={aliasItems} columns={columns} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onClose} data-test-subj="close-index-aliases-flyout">
              <FormattedMessage
                id="xpack.serverlessSearch.indexManagement.indexDetails.overview.aliasesFlyout.closeLabel"
                defaultMessage="Close"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
