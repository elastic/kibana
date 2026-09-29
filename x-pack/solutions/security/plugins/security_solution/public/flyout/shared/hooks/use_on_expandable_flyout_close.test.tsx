/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useWhichFlyout } from '../../document_details/shared/hooks/use_which_flyout';
import { useOnExpandableFlyoutClose } from './use_on_expandable_flyout_close';
import { Flyouts } from '../../document_details/shared/constants/flyouts';
import { TIMELINE_ON_CLOSE_EVENT } from '../..';

vi.mock('../../document_details/shared/hooks/use_which_flyout');

describe('useOnExpandableFlyoutClose', () => {
  const callbackFct = vi.fn().mockImplementation((id: string) => {});

  it('should run the callback function and remove the event listener from the window', () => {
    (useWhichFlyout as Mock).mockReturnValue(Flyouts.timeline);

    window.removeEventListener = vi.fn().mockImplementationOnce((event, callback) => {});

    const { unmount } = renderHook(() => useOnExpandableFlyoutClose({ callback: callbackFct }));

    window.dispatchEvent(
      new CustomEvent(TIMELINE_ON_CLOSE_EVENT, {
        detail: Flyouts.timeline,
      })
    );

    expect(callbackFct).toHaveBeenCalledWith(Flyouts.timeline);

    unmount();

    expect(window.removeEventListener).toHaveBeenCalled();
  });

  it('should add event listener to window', async () => {
    (useWhichFlyout as Mock).mockReturnValue(Flyouts.securitySolution);

    window.addEventListener = vi.fn().mockImplementationOnce((event, callback) => {});

    renderHook(() => useOnExpandableFlyoutClose({ callback: callbackFct }));

    expect(window.addEventListener).toHaveBeenCalled();
  });
});
