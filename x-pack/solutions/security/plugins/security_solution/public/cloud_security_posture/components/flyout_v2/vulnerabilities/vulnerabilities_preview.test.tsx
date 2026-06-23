/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { VulnerabilitiesPreview } from './vulnerabilities_preview';

jest.mock('../../vulnerabilities/vulnerabilities_preview', () => ({
  VulnerabilitiesPreview: jest.fn(() => <div data-test-subj="base-vulnerabilities-preview" />),
}));

import { VulnerabilitiesPreview as VulnerabilitiesPreviewBase } from '../../vulnerabilities/vulnerabilities_preview';

describe('VulnerabilitiesPreview (flyout v2 wrapper)', () => {
  const openDetailsPanel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes the v1 VulnerabilitiesPreview with isPreviewMode enabled and forwards props', () => {
    const { getByTestId } = render(
      <VulnerabilitiesPreview
        identityFields={{ 'host.name': 'my-host' }}
        openDetailsPanel={openDetailsPanel}
      />
    );

    expect(getByTestId('base-vulnerabilities-preview')).toBeInTheDocument();

    const props = (VulnerabilitiesPreviewBase as jest.Mock).mock.calls[0][0];
    expect(props).toEqual(
      expect.objectContaining({
        identityFields: { 'host.name': 'my-host' },
        openDetailsPanel,
        isPreviewMode: true,
      })
    );
  });
});
