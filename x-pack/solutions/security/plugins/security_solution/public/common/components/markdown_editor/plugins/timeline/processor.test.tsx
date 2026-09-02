/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { TimelineMarkDownRenderer } from './processor';
import { ID } from './constants';
import { useTimelineClick } from '../../../../utils/timeline/use_timeline_click';
import { useIsInSecurityApp } from '../../../../hooks/is_in_security_app';
import { useOpenTimelineInNewTab } from '../../../../hooks/timeline/use_open_timeline_in_new_tab';
import { useUpsellingMessage } from '../../../../hooks/use_upselling';
import { useUserPrivileges } from '../../../user_privileges';
import { useAppToasts } from '../../../../hooks/use_app_toasts';

jest.mock('../../../../utils/timeline/use_timeline_click');
jest.mock('../../../../hooks/is_in_security_app');
jest.mock('../../../../hooks/timeline/use_open_timeline_in_new_tab');
jest.mock('../../../../hooks/use_upselling');
jest.mock('../../../user_privileges');
jest.mock('../../../../hooks/use_app_toasts');

const handleTimelineClick = jest.fn();
const openSavedTimelineInNewTab = jest.fn();

describe('TimelineMarkDownRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useTimelineClick as jest.Mock).mockReturnValue(handleTimelineClick);
    (useOpenTimelineInNewTab as jest.Mock).mockReturnValue({ openSavedTimelineInNewTab });
    (useUpsellingMessage as jest.Mock).mockReturnValue(undefined);
    (useUserPrivileges as jest.Mock).mockReturnValue({ timelinePrivileges: { read: true } });
    (useAppToasts as jest.Mock).mockReturnValue({ addError: jest.fn() });
  });

  it('opens the timeline in-app when inside the Security Solution app', () => {
    (useIsInSecurityApp as jest.Mock).mockReturnValue(true);

    render(<TimelineMarkDownRenderer type={ID} id="timeline-id" title="My Timeline" />);
    fireEvent.click(screen.getByTestId('markdown-timeline-link-timeline-id'));

    expect(handleTimelineClick).toHaveBeenCalledWith('timeline-id', expect.any(Function));
    expect(openSavedTimelineInNewTab).not.toHaveBeenCalled();
  });

  it('opens the timeline in a new Security Solution tab when outside the app (e.g. Discover)', () => {
    (useIsInSecurityApp as jest.Mock).mockReturnValue(false);

    render(<TimelineMarkDownRenderer type={ID} id="timeline-id" title="My Timeline" />);
    fireEvent.click(screen.getByTestId('markdown-timeline-link-timeline-id'));

    expect(openSavedTimelineInNewTab).toHaveBeenCalledWith('timeline-id');
    expect(handleTimelineClick).not.toHaveBeenCalled();
  });
});
