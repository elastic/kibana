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
      'Log in to your Splunk admin account, go to the Search and Reporting app and run the following query. Export your results as JSON.'
    );
  });

  it('renders the query', () => {
    const { getByTestId } = render(
      <TestProviders>
        <CopyExportQuery onCopied={jest.fn()} />
      </TestProviders>
    );

    expect(getByTestId('migrationCopyExportQuery')).toBeInTheDocument();
    expect(getByTestId('migrationCopyExportQuery')).toHaveTextContent(
      '| rest /servicesNS/-/-/data/ui/views | search eai:acl.app != "SplunkEnterpriseSecuritySuite" author != "nobody" isDashboard=1 | table id, label, title, description, version, eai:data, eai:acl.app, eai:acl.sharing, eai:acl.owner, updated'
    );
  });

  it('renders the disclaimer', () => {
    const { getByTestId } = render(
      <TestProviders>
        <CopyExportQuery onCopied={jest.fn()} />
      </TestProviders>
    );

    expect(getByTestId('migrationCopyExportDisclaimer')).toBeInTheDocument();
    expect(getByTestId('migrationCopyExportDisclaimer')).toHaveTextContent(
      'Note: To avoid exceeding your LLM API rate limit when translating a large number of queries, consider exporting dashboards in batches, for example by adding | head to the query above'
    );
  });
});
