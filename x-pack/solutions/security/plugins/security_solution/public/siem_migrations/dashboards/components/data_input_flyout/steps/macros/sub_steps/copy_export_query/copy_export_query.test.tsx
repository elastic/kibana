/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { CopyExportQuery } from './copy_export_query';
import { TestProviders } from '../../../../../../../../common/mock/test_providers';

describe('CopyExportQuery', () => {
  it('renders the description', () => {
    const { getByTestId } = render(
      <TestProviders>
        <CopyExportQuery onCopied={jest.fn()} />
      </TestProviders>
    );

    expect(getByTestId('migrationCopyExportQueryDescription')).toBeInTheDocument();
    expect(getByTestId('migrationCopyExportQueryDescription')).toHaveTextContent(
      'From you admin Splunk account, go to the Search and Reporting app and run the above query. Export your results as JSON.'
    );
  });

  it('renders the query codeblock', () => {
    const { getByTestId } = render(
      <TestProviders>
        <CopyExportQuery onCopied={jest.fn()} />
      </TestProviders>
    );

    expect(getByTestId('migrationCopyExportQuery')).toBeInTheDocument();
    expect(getByTestId('migrationCopyExportQuery')).toHaveTextContent(
      '| rest /servicesNS/-/-/admin/macros count=0 | table title, definition'
    );
  });
});
