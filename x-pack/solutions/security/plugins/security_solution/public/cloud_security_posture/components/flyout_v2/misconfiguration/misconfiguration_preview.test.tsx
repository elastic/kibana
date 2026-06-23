/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MisconfigurationsPreview } from './misconfiguration_preview';

jest.mock('../../misconfiguration/misconfiguration_preview', () => ({
  MisconfigurationsPreview: jest.fn(() => <div data-test-subj="base-misconfiguration-preview" />),
}));

import { MisconfigurationsPreview as MisconfigurationsPreviewBase } from '../../misconfiguration/misconfiguration_preview';

describe('MisconfigurationsPreview (flyout v2 wrapper)', () => {
  const openDetailsPanel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes the v1 MisconfigurationsPreview with isPreviewMode enabled and forwards props', () => {
    const { getByTestId } = render(
      <MisconfigurationsPreview
        passedFindings={2}
        failedFindings={1}
        openDetailsPanel={openDetailsPanel}
      />
    );

    expect(getByTestId('base-misconfiguration-preview')).toBeInTheDocument();

    const props = (MisconfigurationsPreviewBase as jest.Mock).mock.calls[0][0];
    expect(props).toEqual(
      expect.objectContaining({
        passedFindings: 2,
        failedFindings: 1,
        openDetailsPanel,
        isPreviewMode: true,
      })
    );
  });
});
