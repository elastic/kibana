/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineId } from '../../../common/types';
import { createMockStore } from '../../common/mock';
import { timelineActions } from '.';
import { selectTimelineById } from './selectors';

describe('timeline reducer: save prompt dismissal', () => {
  const setup = () => {
    const store = createMockStore();
    const get = () => selectTimelineById(store.getState(), TimelineId.active);
    store.dispatch(timelineActions.updateProviders({ id: TimelineId.active, providers: [] }));
    return { store, get };
  };

  it('keeps `changed` when the prompt is dismissed', () => {
    const { store, get } = setup();

    store.dispatch(
      timelineActions.setSavePromptDismissed({ id: TimelineId.active, dismissed: true })
    );

    expect(get().changed).toBe(true);
    expect(get().savePromptDismissed).toBe(true);
  });

  it('re-arms the prompt on the next change action', () => {
    const { store, get } = setup();
    store.dispatch(
      timelineActions.setSavePromptDismissed({ id: TimelineId.active, dismissed: true })
    );

    store.dispatch(timelineActions.updateProviders({ id: TimelineId.active, providers: [] }));

    expect(get().changed).toBe(true);
    expect(get().savePromptDismissed).toBe(false);
  });

  it('clears the dismissal when the timeline is marked as saved', () => {
    const { store, get } = setup();
    store.dispatch(
      timelineActions.setSavePromptDismissed({ id: TimelineId.active, dismissed: true })
    );

    store.dispatch(timelineActions.setChanged({ id: TimelineId.active, changed: false }));

    expect(get().changed).toBe(false);
    expect(get().savePromptDismissed).toBe(false);
  });
});
