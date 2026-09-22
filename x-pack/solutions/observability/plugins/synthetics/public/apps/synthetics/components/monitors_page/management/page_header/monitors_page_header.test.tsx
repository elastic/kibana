/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render, makeSyntheticsPermissionsCore } from '../../../../utils/testing/rtl_helpers';
import { MonitorsPageHeader } from './monitors_page_header';

describe('MonitorsPageHeader', () => {
  it('shows a read only badge when the user cannot save', () => {
    render(<MonitorsPageHeader />, {
      core: makeSyntheticsPermissionsCore({ save: false }),
    });

    expect(screen.getByTestId('syntheticsReadOnlyBadge')).toBeInTheDocument();
  });

  it('does not show a read only badge when the user can save', () => {
    render(<MonitorsPageHeader />, {
      core: makeSyntheticsPermissionsCore({ save: true }),
    });

    expect(screen.queryByTestId('syntheticsReadOnlyBadge')).not.toBeInTheDocument();
  });

  it('still shows a read only badge for a user who can only manage rules, since they cannot edit monitors', () => {
    render(<MonitorsPageHeader />, {
      core: makeSyntheticsPermissionsCore({ save: false, canManageRules: true }),
    });

    expect(screen.getByTestId('syntheticsReadOnlyBadge')).toBeInTheDocument();
  });
});
