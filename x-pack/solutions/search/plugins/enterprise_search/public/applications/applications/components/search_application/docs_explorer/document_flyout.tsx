/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import {
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiInMemoryTable,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { FieldIcon } from '../field_icon';

import {
  addTypeToResults,
  ConvertedResultWithType,
  convertResultToFieldsAndIndex,
  FieldValue,
} from './convert_results';
import { SearchApplicationDocsExplorerLogic } from './docs_explorer_logic';
import { useSelectedDocument } from './document_context';
import { FieldValueCell } from './field_value_cell';

export const DocumentFlyout: React.FC = () => {
  const { fieldTypesByIndex } = useValues(SearchApplicationDocsExplorerLogic);
  const { selectedDocument, setSelectedDocument } = useSelectedDocument();

  if (!selectedDocument) return null;

  const id = selectedDocument._meta.rawHit.__id;

  const { fields, index } = convertResultToFieldsAndIndex(selectedDocument);
  const fieldTypes = fieldTypesByIndex[index];

  if (!fieldTypes) return null;

  const items = addTypeToResults(fields, fieldTypes);

  const columns: Array<EuiBasicTableColumn<ConvertedResultWithType>> = [
    {
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.documentFlyout.fieldLabel',
        { defaultMessage: 'Field' }
      ),
      render: ({ field: key, type }: ConvertedResultWithType) => (
        <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
          <FieldIcon type={type} />
          <EuiText>
            <EuiTextColor color="subdued">
              <code>{key}</code>
            </EuiTextColor>
          </EuiText>
        </EuiFlexGroup>
      ),
      truncateText: false,
    },
    {
      field: 'value',
      name: i18n.translate(
        'xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.documentFlyout.valueLabel',
        { defaultMessage: 'Value' }
      ),
      render: (value: FieldValue) => (
        <EuiText>
          <code>
            <FieldValueCell value={value} />
          </code>
        </EuiText>
      ),
      truncateText: false,
    },
  ];

  return (
    <EuiFlyout onClose={() => setSelectedDocument(null)}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.documentFlyout.title"
                defaultMessage="Document: {id}"
                values={{ id }}
              />
            </h2>
          </EuiTitle>
          <EuiTextColor color="subdued">
            <FormattedMessage
              id="xpack.enterpriseSearch.searchApplications.searchApplication.docsExplorer.documentFlyout.fieldCount"
              defaultMessage="{fieldCount} {fieldCount, plural, one {Field} other {Fields}}"
              values={{ fieldCount: items.length }}
            />
          </EuiTextColor>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiInMemoryTable columns={columns} items={items} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
