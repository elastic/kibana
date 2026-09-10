/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DashboardsUploadSubSteps } from '.';
import { TestProviders } from '../../../../../../../common/mock';
import { getDashboardMigrationStatsMock } from '../../../../../__mocks__';
import { MigrationSource } from '../../../../../../common/types';

const MIGRATION_NAME_TITLE = 'Migration name';
const COPY_EXPORT_QUERY_TITLE = 'Export Splunk dashboards';
const DASHBOARDS_FILE_UPLOAD_TITLE = 'Update exported dashboards';
const CHECK_RESOURCES_TITLE = 'Check for macros and lookups';

jest.mock('../../../../../../common/components', () => ({
  ...jest.requireActual('../../../../../../common/components'),
  useMigrationNameStep: () => ({
    title: MIGRATION_NAME_TITLE,
    status: 'current',
    children: <div>{'Migration Name Content'}</div>,
  }),
}));
jest.mock('./copy_export_query', () => ({
  useCopyExportQueryStep: () => ({
    title: COPY_EXPORT_QUERY_TITLE,
    status: 'incomplete',
    children: <div>{'Copy Export Query Content'}</div>,
  }),
}));
jest.mock('./dashboards_file_upload', () => ({
  useDashboardsFileUploadStep: () => ({
    title: DASHBOARDS_FILE_UPLOAD_TITLE,
    status: 'incomplete',
    children: <div>{'Dashboards File Upload Content'}</div>,
  }),
}));
jest.mock('../../common/check_resources', () => ({
  useCheckResourcesStep: () => ({
    title: CHECK_RESOURCES_TITLE,
    status: 'incomplete',
    children: <div>{'Check Resources Content'}</div>,
  }),
}));

describe('DashboardsUploadSubSteps', () => {
  const defaultProps = {
    migrationSource: MigrationSource.SPLUNK,
    onMissingResourcesFetched: jest.fn(),
    onMigrationCreated: jest.fn(),
  };

  it('renders all steps when no migrationStats are provided', () => {
    const { getByText } = render(<DashboardsUploadSubSteps {...defaultProps} />, {
      wrapper: TestProviders,
    });

    expect(getByText(MIGRATION_NAME_TITLE)).toBeInTheDocument();
    expect(getByText(COPY_EXPORT_QUERY_TITLE)).toBeInTheDocument();
    expect(getByText(DASHBOARDS_FILE_UPLOAD_TITLE)).toBeInTheDocument();
    expect(getByText(CHECK_RESOURCES_TITLE)).toBeInTheDocument();
  });

  it('renders all steps when migrationStats are provided', () => {
    const { getByText } = render(
      <DashboardsUploadSubSteps
        {...defaultProps}
        migrationStats={getDashboardMigrationStatsMock()}
      />,
      { wrapper: TestProviders }
    );

    expect(getByText(MIGRATION_NAME_TITLE)).toBeInTheDocument();
    expect(getByText(COPY_EXPORT_QUERY_TITLE)).toBeInTheDocument();
    expect(getByText(DASHBOARDS_FILE_UPLOAD_TITLE)).toBeInTheDocument();
    expect(getByText(CHECK_RESOURCES_TITLE)).toBeInTheDocument();
  });
});
