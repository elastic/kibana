/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexItem } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FieldPath } from 'react-hook-form';
import { CreateSLOForm } from '../../types';
import type { SearchBarProps } from './query_builder';
import { QueryDocumentsFlyout } from './query_documents_flyout';

interface Props {
  searchBarProps: SearchBarProps;
  dataView?: DataView;
  name: FieldPath<CreateSLOForm>;
}

export function QueryDocumentsFlyoutOpenButton({ name, dataView, searchBarProps }: Props) {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  return (
    <EuiFlexItem grow={false}>
      <EuiButtonIcon
        css={{ marginTop: 27 }}
        isDisabled={!Boolean(dataView)}
        data-test-subj="o11yQueryBuilderButton"
        iconType="documents"
        onClick={() => setIsFlyoutOpen(true)}
        aria-label={i18n.translate('xpack.slo.queryBuilder.documentsButtonLabel', {
          defaultMessage: 'View documents',
        })}
      />
      {isFlyoutOpen && dataView && (
        <QueryDocumentsFlyout
          dataView={dataView}
          name={name}
          searchBarProps={searchBarProps}
          onCloseFlyout={() => setIsFlyoutOpen(false)}
        />
      )}
    </EuiFlexItem>
  );
}
