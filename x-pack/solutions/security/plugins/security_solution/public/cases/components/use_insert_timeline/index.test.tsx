/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';

import { mockTimelineModel } from '../../../common/mock/timeline_results';
import { useFormatUrl } from '../../../common/components/link_to';
import { SecurityPageName } from '../../../app/types';
import { useInsertTimeline } from '.';

const mockDispatch = vi.fn();

vi.mock('react-redux-v7', () => {
  const original = require('react-redux-v7');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

vi.mock('../../../common/components/link_to', async () => {
  const originalModule = (await vi.importActual('../../../common/components/link_to'));
  return {
    ...originalModule,
    getTimelineTabsUrl: vi.fn(),
    useFormatUrl: vi.fn().mockReturnValue({
      formatUrl: vi.fn().mockImplementation((path: string) => path),
      search: '',
    }),
  };
});

vi.mock('../../../common/hooks/use_selector', () => {
      const mocked = {
      useShallowEqualSelector: vi.fn().mockReturnValue({
        timelineTitle: mockTimelineModel.title,
        timelineSavedObjectId: mockTimelineModel.savedObjectId,
        timelineId: mockTimelineModel.id,
      }),
    };
      return { ...mocked, default: mocked };
    });

describe('useInsertTimeline', () => {
  const onChange = vi.fn();
  const { formatUrl } = useFormatUrl(SecurityPageName.timelines);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('init', async () => {
    renderHook(() => useInsertTimeline('', onChange));

    expect(mockDispatch).toHaveBeenNthCalledWith(1, {
      payload: { id: 'ef579e40-jibber-jabber', show: false },
      type: 'x-pack/security_solution/local/timeline/SHOW_TIMELINE',
    });

    expect(mockDispatch).toHaveBeenNthCalledWith(2, {
      payload: null,
      type: 'x-pack/security_solution/local/timeline/SET_INSERT_TIMELINE',
    });

    expect(onChange).toHaveBeenCalledWith(
      `[Test rule](?timeline=(id:'ef579e40-jibber-jabber',isOpen:!t))`
    );
  });

  it('it appends the value if is not empty', async () => {
    renderHook(() => useInsertTimeline('New value', onChange));

    expect(onChange).toHaveBeenCalledWith(
      `New value [Test rule](?timeline=(id:'ef579e40-jibber-jabber',isOpen:!t))`
    );
  });

  it('calls formatUrl with correct options', async () => {
    renderHook(() => useInsertTimeline('', onChange));

    expect(formatUrl).toHaveBeenCalledWith(`?timeline=(id:'ef579e40-jibber-jabber',isOpen:!t)`, {
      absolute: true,
      skipSearch: true,
    });
  });
});
