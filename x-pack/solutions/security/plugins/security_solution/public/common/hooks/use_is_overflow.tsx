/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';

/**
 * It checks if the element that receives the returned Ref has oveflow the max height.
 */
export const useIsOverflow: (
  dependency: unknown
) => [isOveflow: boolean | null, ref: React.RefObject<HTMLDivElement>] = (dependency) => {
  const [isOverflow, setIsOverflow] = useState<boolean | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current?.clientHeight != null) {
      if ((ref?.current?.scrollHeight ?? 0) > (ref?.current?.clientHeight ?? 0)) {
        setIsOverflow(true);
      }

      if ((ref.current?.scrollHeight ?? 0) <= (ref?.current?.clientHeight ?? 0)) {
        setIsOverflow(false);
      }
    }
  }, [ref, dependency]);

  return [isOverflow, ref];
};
