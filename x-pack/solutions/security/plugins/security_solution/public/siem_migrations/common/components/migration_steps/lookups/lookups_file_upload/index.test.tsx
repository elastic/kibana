/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { LookupsFileUpload } from '.';
import { MigrationSource } from '../../../../types';

describe('LookupsFileUpload', () => {
  const props = { createResources: jest.fn(), migrationSource: MigrationSource.SPLUNK };

  it('renders the file picker', () => {
    const { getByTestId } = render(<LookupsFileUpload {...props} />);
    expect(getByTestId('lookupsFilePicker')).toBeInTheDocument();
  });

  it('renders the file upload button', () => {
    const { getByTestId } = render(<LookupsFileUpload {...props} />);
    expect(getByTestId('uploadFileButton')).toBeInTheDocument();
  });
});
