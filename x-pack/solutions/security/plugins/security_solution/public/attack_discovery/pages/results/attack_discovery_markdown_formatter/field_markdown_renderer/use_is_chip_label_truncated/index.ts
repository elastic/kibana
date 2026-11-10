/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RefObject } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import type { ParsedField } from '../../types';

interface UseIsChipLabelTruncated {
  chipLabelRef: RefObject<HTMLSpanElement>;
  isValueTruncated: boolean;
}

/**
 * Detects whether the chip label attached to `chipLabelRef` is visually truncated, so the
 * full-value tooltip is only shown when needed. Re-measures whenever `value` changes, because a
 * different value changes the text width. Pass `isEnabled: false` for a label that never clips
 * (e.g. a wrapped one) to skip the layout read.
 */
export const useIsChipLabelTruncated = (
  value: ParsedField['value'],
  isEnabled = true
): UseIsChipLabelTruncated => {
  const chipLabelRef = useRef<HTMLSpanElement>(null);
  const [isValueTruncated, setIsValueTruncated] = useState(false);

  useLayoutEffect(() => {
    if (!isEnabled) {
      setIsValueTruncated(false);
      return;
    }

    const el = chipLabelRef.current;
    setIsValueTruncated(el != null && el.scrollWidth > el.clientWidth);
  }, [isEnabled, value]);

  return { chipLabelRef, isValueTruncated };
};
