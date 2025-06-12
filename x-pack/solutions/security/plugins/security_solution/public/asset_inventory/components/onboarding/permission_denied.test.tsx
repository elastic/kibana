/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PermissionDenied } from './permission_denied';
import { renderWithTestProvider } from '../../test/test_provider';
import { screen } from '@testing-library/dom';
import { TEST_SUBJ_ONBOARDING_PERMISSION_DENIED } from '../../constants';
import type { AssetInventoryStatusResponse } from '../../../../common/api/asset_inventory/types';

describe('PermissionDenied Component', () => {
  it('should render the component correctly', () => {
    renderWithTestProvider(<PermissionDenied />);

    expect(screen.getByTestId(TEST_SUBJ_ONBOARDING_PERMISSION_DENIED)).toBeInTheDocument();
    expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
    expect(screen.getByText(/need help?/i)).toBeInTheDocument();
  });

  it('should render the insufficient permissions callout when the privileges are passed', () => {
    const privileges: AssetInventoryStatusResponse['privileges'] = {
      has_all_required: false,
      has_read_permissions: true,
      has_write_permissions: false,
      privileges: {
        elasticsearch: {
          index: { 'logs-*': { read: false, view_index_metadata: false } },
        },
      },
    };

    renderWithTestProvider(<PermissionDenied privileges={privileges} />);

    expect(screen.getByText(/missing elasticsearch index privileges/i)).toBeInTheDocument();
  });
});
