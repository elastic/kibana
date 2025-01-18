/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { JourneyScreenshotPreview, StepImagePopoverProps } from './journey_screenshot_preview';
import { render } from '../../../utils/testing';
import { THUMBNAIL_SCREENSHOT_SIZE } from '../screenshot/screenshot_size';

let dialogProps: Record<string, unknown> = {};
jest.mock('../screenshot/journey_screenshot_dialog', () => ({
  ...jest.requireActual('../screenshot/journey_screenshot_dialog'),
  JourneyScreenshotDialog: (props: {
    checkGroup: string | undefined;
    initialImgSrc: string | undefined;
    initialStepNumber: number;
    maxSteps: number | undefined;
    isOpen: boolean;
    onClose: () => void;
  }) => {
    dialogProps = props;
    return (
      <div>
        {props.isOpen ? <img alt="img-in-dialog" src={props.initialImgSrc} /> : null}
        <button onClick={props.onClose}>Close dialog</button>
      </div>
    );
  },
}));

describe('JourneyScreenshotPreview', () => {
  const testCheckGroup = 'test-check-group';
  const testImgUrl1 = 'https://localhost/test-img-url-1';
  let defaultProps: StepImagePopoverProps;

  beforeEach(() => {
    defaultProps = {
      checkGroup: testCheckGroup,
      stepName: 'First step',
      stepNumber: 1,
      imgSrc: testImgUrl1,
      maxSteps: 2,
      isStepFailed: false,
      isLoading: false,
      size: THUMBNAIL_SCREENSHOT_SIZE,
      unavailableMessage: undefined,
      borderRadius: 0,
    };

    dialogProps = {};
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('opens displays full-size image on click, hides after close is clicked', async () => {
    const { getByAltText, getByText, queryByAltText } = render(
      <JourneyScreenshotPreview {...defaultProps} />
    );
    const img = getByAltText('"First step", 1 of 2');
    fireEvent.click(img);
    expect(dialogProps.checkGroup).toEqual(defaultProps.checkGroup);
    expect(getByAltText('img-in-dialog')).not.toBeNull();
    fireEvent.click(getByText('Close dialog'));
    expect(queryByAltText('img-in-dialog')).toBeNull();
  });

  it('shows the popover when image is hovered', async () => {
    const { getByAltText, queryByText, getByText } = render(
      <JourneyScreenshotPreview {...defaultProps} />
    );

    const img = getByAltText('"First step", 1 of 2');
    const euiPopoverMessage =
      'You are in a dialog. Press Escape, or tap/click outside the dialog to close.'; // Helps to detect if popover is open
    expect(queryByText(euiPopoverMessage)).toBeNull();
    fireEvent.mouseEnter(img);
    await waitFor(() => getByText(euiPopoverMessage));
    expect(getByText(euiPopoverMessage)).toBeInTheDocument();
    fireEvent.mouseLeave(img);
    await waitFor(() => expect(queryByText(euiPopoverMessage)).not.toBeInTheDocument());
  });

  it('renders the correct image', () => {
    const { getByAltText } = render(<JourneyScreenshotPreview {...defaultProps} />);
    const img = getByAltText('"First step", 1 of 2');
    expect(img).toHaveAttribute('src', testImgUrl1);
  });
});
