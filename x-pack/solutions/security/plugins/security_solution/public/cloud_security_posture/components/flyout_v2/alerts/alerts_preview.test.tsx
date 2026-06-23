/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertsPreview } from './alerts_preview';

jest.mock('../../alerts/alerts_preview', () => ({
  AlertsPreview: jest.fn(() => <div data-test-subj="base-alerts-preview" />),
}));

import { AlertsPreview as AlertsPreviewBase } from '../../alerts/alerts_preview';

describe('AlertsPreview (flyout v2 wrapper)', () => {
  const openDetailsPanel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes the v1 AlertsPreview with isPreviewMode enabled and forwards props', () => {
    const alertsData = { open: { total: 3, severities: [] } };

    const { getByTestId } = render(
      <AlertsPreview alertsData={alertsData} openDetailsPanel={openDetailsPanel} />
    );

    expect(getByTestId('base-alerts-preview')).toBeInTheDocument();

    const props = (AlertsPreviewBase as jest.Mock).mock.calls[0][0];
    expect(props).toEqual(
      expect.objectContaining({
        alertsData,
        openDetailsPanel,
        isPreviewMode: true,
      })
    );
  });
});
