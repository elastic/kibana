/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

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

vi.mock('../../../../utils/timeline/use_timeline_click');
vi.mock('../../../../hooks/is_in_security_app');
vi.mock('../../../../hooks/timeline/use_open_timeline_in_new_tab');
vi.mock('../../../../hooks/use_upselling');
vi.mock('../../../user_privileges');
vi.mock('../../../../hooks/use_app_toasts');

const handleTimelineClick = vi.fn();
const openSavedTimelineInNewTab = vi.fn();

describe('TimelineMarkDownRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useTimelineClick as Mock).mockReturnValue(handleTimelineClick);
    (useOpenTimelineInNewTab as Mock).mockReturnValue({ openSavedTimelineInNewTab });
    (useUpsellingMessage as Mock).mockReturnValue(undefined);
    (useUserPrivileges as Mock).mockReturnValue({ timelinePrivileges: { read: true } });
    (useAppToasts as Mock).mockReturnValue({ addError: vi.fn() });
  });

  it('opens the timeline in-app when inside the Security Solution app', () => {
    (useIsInSecurityApp as Mock).mockReturnValue(true);

    render(<TimelineMarkDownRenderer type={ID} id="timeline-id" title="My Timeline" />);
    fireEvent.click(screen.getByTestId('markdown-timeline-link-timeline-id'));

    expect(handleTimelineClick).toHaveBeenCalledWith('timeline-id', expect.any(Function));
    expect(openSavedTimelineInNewTab).not.toHaveBeenCalled();
  });

  it('opens the timeline in a new Security Solution tab when outside the app (e.g. Discover)', () => {
    (useIsInSecurityApp as Mock).mockReturnValue(false);

    render(<TimelineMarkDownRenderer type={ID} id="timeline-id" title="My Timeline" />);
    fireEvent.click(screen.getByTestId('markdown-timeline-link-timeline-id'));

    expect(openSavedTimelineInNewTab).toHaveBeenCalledWith('timeline-id');
    expect(handleTimelineClick).not.toHaveBeenCalled();
  });
});
