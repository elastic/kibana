/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ShareUrlIconButton } from './share_url_icon_button';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiCopy: jest.fn(({ children: functionAsChild }) => functionAsChild(jest.fn())),
}));

describe('ShareUrlIconButton', () => {
  it('renders nothing when url is null', () => {
    const { container } = render(
      <ShareUrlIconButton url={null} tooltip="tip" ariaLabel="share" dataTestSubj="shareBtn" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders button when url is set', () => {
    const { getByRole } = render(
      <ShareUrlIconButton
        url="https://example.com/x"
        tooltip="tip"
        ariaLabel="share"
        dataTestSubj="shareBtn"
      />
    );
    expect(getByRole('button', { name: 'share' })).toBeInTheDocument();
  });
});
