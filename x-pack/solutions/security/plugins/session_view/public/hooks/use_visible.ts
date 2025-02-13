/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useRef, MutableRefObject, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import { DEBOUNCE_TIMEOUT } from '../../common/constants';

interface IUseVisibleDeps {
  viewPortEl: HTMLDivElement | null;
  visibleCallback: (isVisible: boolean, isAbove: boolean) => void;
  shouldAddListener?: boolean;
  offset?: number;
  debounceTimeout?: number;
}

/**
 * Check if an element is in viewport

 * @param {HTMLDivElement} viewPortEl - View port element of where the scroll takes place
 * @param {function} visibleCallback - callback called onScroll, expects (isVisbile: boolean, isAbove: boolean) as params
 * @param {boolean} shouldAddListener - if useVisible hook should add the scroll listener
 * @param {number} offset - Number of pixels up to the observable element from the top
 * @param {number} debounceTimeout - debounce timeout, in ms
 */
export function useVisible({
  viewPortEl,
  visibleCallback,
  shouldAddListener = false,
  offset = 0,
  debounceTimeout = DEBOUNCE_TIMEOUT,
}: IUseVisibleDeps): MutableRefObject<HTMLDivElement | null> {
  const currentElement = useRef<HTMLDivElement | null>(null);

  const onScroll = useMemo(
    () =>
      debounce(() => {
        if (!currentElement.current || !viewPortEl) {
          return;
        }

        const { height: elHeight, y: elTop } = currentElement.current.getBoundingClientRect();
        const { y: viewPortElTop } = viewPortEl.getBoundingClientRect();

        const viewPortElBottom = viewPortElTop + viewPortEl.clientHeight;
        const elBottom = elTop + elHeight;
        const isVisible = elBottom + offset >= viewPortElTop && elTop - offset <= viewPortElBottom;

        // if elBottom + offset < viewPortElTop, the currentElement is above the current scroll window
        visibleCallback(isVisible, elBottom + offset < viewPortElTop);
      }, debounceTimeout),
    [debounceTimeout, offset, viewPortEl, visibleCallback]
  );

  useEffect(() => {
    if (shouldAddListener) {
      viewPortEl?.addEventListener('scroll', onScroll);
    }

    return () => {
      if (shouldAddListener) {
        viewPortEl?.removeEventListener('scroll', onScroll);
      }
    };
  }, [onScroll, viewPortEl, shouldAddListener]);

  return currentElement;
}
