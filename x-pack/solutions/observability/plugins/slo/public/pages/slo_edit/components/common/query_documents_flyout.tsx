/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiTitle,
} from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { FieldPath } from 'react-hook-form';
import { CreateSLOForm } from '../../types';
import { DocumentsTable } from './documents_table';
import type { SearchBarProps } from './query_builder';

interface Props {
  dataView: DataView;
  searchBarProps: SearchBarProps;
  onCloseFlyout: () => void;
  name: FieldPath<CreateSLOForm>;
}

export function QueryDocumentsFlyout({ name, dataView, searchBarProps, onCloseFlyout }: Props) {
  return (
    <EuiFlyoutResizable
      onClose={() => onCloseFlyout()}
      size="1050px"
      minWidth={500}
      maxWidth={1200}
    >
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.slo.queryBuilder.h2.documentsLabel', {
              defaultMessage: 'Documents for {indexPattern}',
              values: { indexPattern: dataView.getIndexPattern() },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <DocumentsTable dataView={dataView} searchBarProps={searchBarProps} name={name} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton data-test-subj="o11yQueryBuilderCloseButton" onClick={() => onCloseFlyout()}>
          {i18n.translate('xpack.slo.queryBuilder.closeButtonLabel', {
            defaultMessage: 'Close',
          })}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
}
