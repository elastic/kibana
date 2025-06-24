/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import _ from 'lodash';
import { DEBOUNCE_TIMEOUT } from '../../common/constants';

const SCROLL_END_BUFFER_HEIGHT = 20;

function getScrollPosition(div: HTMLElement) {
  if (div) {
    return div.scrollTop;
  } else {
    return document.documentElement.scrollTop || document.body.scrollTop;
  }
}

interface IUseScrollDeps {
  div: HTMLElement | null;
  handler(pos: number, endReached: boolean): void;
}

/**
 * listens to scroll events on given div, if scroll reaches bottom, calls a callback
 * @param {ref} ref to listen to scroll events on
 * @param {function} handler function receives params (scrollTop, endReached)
 */
export function useScroll({ div, handler }: IUseScrollDeps) {
  useEffect(() => {
    if (div) {
      const debounced = _.debounce(() => {
        const pos = getScrollPosition(div);
        const endReached = pos + div.offsetHeight > div.scrollHeight - SCROLL_END_BUFFER_HEIGHT;

        handler(pos, endReached);
      }, DEBOUNCE_TIMEOUT);

      div.onscroll = debounced;

      return () => {
        debounced.cancel();

        div.onscroll = null;
      };
    }
  }, [div, handler]);
}
