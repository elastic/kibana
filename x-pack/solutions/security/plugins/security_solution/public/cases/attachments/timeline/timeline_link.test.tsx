/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TimelineLink } from './timeline_link';
import { useUpsellingMessage } from '../../../common/hooks/use_upselling';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useTimelineClick } from '../../../common/utils/timeline/use_timeline_click';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { FAILED_TO_RETRIEVE_TIMELINE, TIMELINE_ERROR_TITLE } from './translations';

jest.mock('../../../common/hooks/use_upselling');
jest.mock('../../../common/components/user_privileges');
jest.mock('../../../common/utils/timeline/use_timeline_click');
jest.mock('../../../common/hooks/use_app_toasts');

const useUpsellingMessageMock = useUpsellingMessage as jest.Mock;
const useUserPrivilegesMock = useUserPrivileges as jest.Mock;
const useTimelineClickMock = useTimelineClick as jest.Mock;
const useAppToastsMock = useAppToasts as jest.Mock;

const baseProps = {
  savedObjectId: 'attachment-so-1',
  timelineId: 'timeline-id-1',
  title: 'My investigation',
};

describe('TimelineLink', () => {
  const handleTimelineClick = jest.fn();
  const addError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useUpsellingMessageMock.mockReturnValue(undefined);
    useUserPrivilegesMock.mockReturnValue({ timelinePrivileges: { read: true } });
    useTimelineClickMock.mockReturnValue(handleTimelineClick);
    useAppToastsMock.mockReturnValue({ addError });
  });

  it('renders the title as a link with the expected test subject', () => {
    render(<TimelineLink {...baseProps} />);

    expect(screen.getByTestId('timeline-user-action-attachment-so-1')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-attachment-link-timeline-id-1')).toHaveTextContent(
      'My investigation'
    );
  });

  it('invokes handleTimelineClick on click when enabled', async () => {
    render(<TimelineLink {...baseProps} />);

    await userEvent.click(screen.getByTestId('timeline-attachment-link-timeline-id-1'));

    expect(handleTimelineClick).toHaveBeenCalledTimes(1);
    expect(handleTimelineClick).toHaveBeenCalledWith('timeline-id-1', expect.any(Function));
  });

  it('does not invoke handleTimelineClick when an upsell message is set', async () => {
    useUpsellingMessageMock.mockReturnValue('Upgrade to use timelines');
    render(<TimelineLink {...baseProps} />);

    await userEvent.click(screen.getByTestId('timeline-attachment-link-timeline-id-1'));

    expect(handleTimelineClick).not.toHaveBeenCalled();
  });

  it('does not invoke handleTimelineClick when the user cannot read timelines', async () => {
    useUserPrivilegesMock.mockReturnValue({ timelinePrivileges: { read: false } });
    render(<TimelineLink {...baseProps} />);

    await userEvent.click(screen.getByTestId('timeline-attachment-link-timeline-id-1'));

    expect(handleTimelineClick).not.toHaveBeenCalled();
  });

  it('forwards retrieval errors to addError with the localized title and message', async () => {
    render(<TimelineLink {...baseProps} />);

    await userEvent.click(screen.getByTestId('timeline-attachment-link-timeline-id-1'));

    const [, onError] = handleTimelineClick.mock.calls[0];
    const error = new Error('boom');
    onError(error, 'timeline-id-1');

    expect(addError).toHaveBeenCalledWith(error, {
      title: TIMELINE_ERROR_TITLE,
      toastMessage: FAILED_TO_RETRIEVE_TIMELINE('timeline-id-1'),
    });
  });
});
