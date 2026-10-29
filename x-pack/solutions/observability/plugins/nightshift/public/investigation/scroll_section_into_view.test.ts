/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scrollSectionIntoView } from './scroll_section_into_view';

const scrollTo = jest.fn();

describe('scrollSectionIntoView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    scrollTo.mockClear();
    Element.prototype.scrollTo = scrollTo;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('scrolls over the given duration, then reports it is done', () => {
    const onDone = jest.fn();
    scrollSectionIntoView(document.createElement('div'), 250, onDone);

    jest.advanceTimersByTime(100);
    expect(scrollTo).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('stops without reporting done when it is cancelled', () => {
    const onDone = jest.fn();
    const cancel = scrollSectionIntoView(document.createElement('div'), 250, onDone);

    jest.advanceTimersByTime(50);
    cancel();
    scrollTo.mockClear();
    jest.advanceTimersByTime(500);

    expect(scrollTo).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
