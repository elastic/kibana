/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, waitFor } from '@testing-library/react';
import { screen } from '@elastic/eui/lib/test/rtl';
import React from 'react';
import { StepImagePopover, StepImagePopoverProps } from './step_image_popover';
import { render } from '../../../../../lib/helper/rtl_helpers';

describe('StepImagePopover', () => {
  let defaultProps: StepImagePopoverProps;

  beforeEach(() => {
    defaultProps = {
      captionContent: 'test caption',
      imageCaption: <div>test caption element</div>,
      imgSrc: 'http://sample.com/sampleImageSrc.png',
      isImagePopoverOpen: false,
    };
  });

  it('opens displays full-size image on click, hides after close is closed', async () => {
    const { getByAltText } = render(<StepImagePopover {...defaultProps} />);

    expect(screen.queryByTestSubject('deactivateFullScreenButton')).toBeNull();

    const caption = getByAltText('test caption');
    fireEvent.click(caption);

    await waitFor(() => {
      fireEvent.click(screen.getByTestSubject('deactivateFullScreenButton'));
    });

    await waitFor(() => {
      expect(screen.queryByTestSubject('deactivateFullScreenButton')).toBeNull();
    });
  });

  it('shows the popover when `isOpen` is true', () => {
    defaultProps.isImagePopoverOpen = true;

    const { getByAltText } = render(<StepImagePopover {...defaultProps} />);

    expect(getByAltText(`A larger version of the screenshot for this journey step's thumbnail.`));
  });

  it('renders caption content', () => {
    const { getByRole } = render(<StepImagePopover {...defaultProps} />);
    const image = getByRole('img');
    expect(image).toHaveAttribute('alt', 'test caption');
    expect(image).toHaveAttribute('src', 'http://sample.com/sampleImageSrc.png');
  });
});
