/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { ShareUrlIconButton } from './share_url_icon_button';

vi.mock('@elastic/eui', async () => {
  const mocked = {
    ...(await vi.importActual('@elastic/eui')),
    EuiCopy: vi.fn(({ children: functionAsChild }) => functionAsChild(vi.fn())),
  };
  return { ...mocked, default: mocked };
});

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
