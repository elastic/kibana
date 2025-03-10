/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { OnboardingCardContentAssetPanel } from './card_content_asset_panel';
import { CardAssetType } from '../types';

describe('OnboardingCardContentAssetPanel', () => {
  const defaultProps = {
    asset: {
      type: CardAssetType.image,
      source: 'https://example.com/image.jpg',
      alt: 'Example image',
    },
    children: <div data-test-subj="childContent">{'Mock child'}</div>,
  };

  it('renders an image when asset type is image', () => {
    const { getByAltText } = render(<OnboardingCardContentAssetPanel {...defaultProps} />);

    const image = getByAltText('Example image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('renders a video when asset type is video', () => {
    const videoProps = {
      asset: {
        type: CardAssetType.video,
        source: 'https://example.com/video.mp4',
        alt: 'Example video',
      },
      children: <div data-test-subj="childContent">{'Mock child'}</div>,
    };

    const { getByTitle } = render(<OnboardingCardContentAssetPanel {...videoProps} />);

    const video = getByTitle('title');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'https://example.com/video.mp4');
    expect(video).toHaveAttribute('allowFullScreen');
    expect(video).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin');
    expect(video).toHaveAttribute('height', '275px');
    expect(video).toHaveAttribute('width', '488px');
  });
});
