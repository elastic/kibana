/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore, kibanaMock } from '../../../common/mock';
import { TimelineId } from '../../../../common/types/timeline';

import { showTimeline } from '../actions';

jest.mock('../actions', () => {
  const actual = jest.requireActual('../actions');
  const showTL = jest.fn((...args) => actual.showTimeline(...args));
  (showTL as unknown as { match: Function }).match = () => false;
  (showTL as unknown as { type: string }).type = actual.showTimeline.type;
  return {
    ...actual,
    showTimeline: showTL,
  };
});

const showTimelineMock = showTimeline as unknown as jest.Mock;

describe('Timeline privileges middleware', () => {
  let store = createMockStore(undefined, undefined, kibanaMock);

  beforeEach(() => {
    store = createMockStore(undefined, undefined, kibanaMock);
    showTimelineMock.mockClear();
  });

  it('should not show a toast when a timeline should be shown to a user with sufficient timeline privileges', async () => {
    const addWarningMock = jest.spyOn(kibanaMock.notifications.toasts, 'addWarning');

    await store.dispatch(showTimeline({ id: TimelineId.test, show: true }));

    expect(addWarningMock).not.toHaveBeenCalled();
  });

  it('should show a toast when a timeline should be shown to a user with insufficient timeline privileges', async () => {
    const addWarningMock = jest.spyOn(kibanaMock.notifications.toasts, 'addWarning');
    store = createMockStore(undefined, undefined, {
      ...kibanaMock,
      application: {
        ...kibanaMock.application,
        capabilities: {
          ...kibanaMock.application.capabilities,
          securitySolutionTimeline: {
            read: false,
          },
        },
      },
    });
    await store.dispatch(showTimeline({ id: TimelineId.test, show: true }));

    expect(addWarningMock).toHaveBeenCalled();
    expect(showTimelineMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: TimelineId.test, show: false })
    );
  });
});
