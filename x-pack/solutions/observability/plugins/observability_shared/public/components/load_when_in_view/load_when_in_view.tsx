/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiSkeletonRectangle } from '@elastic/eui';
import useIntersection from 'react-use/lib/useIntersection';

export interface LoadWhenInViewProps {
  children: JSX.Element;
  initialHeight?: string | number;
  placeholderTitle: string;
}

// eslint-disable-next-line import/no-default-export
export default function LoadWhenInView({
  children,
  placeholderTitle,
  initialHeight = 100,
}: LoadWhenInViewProps) {
  const intersectionRef = React.useRef(null);
  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '0px',
    threshold: 0.25,
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (intersection && intersection.intersectionRatio > 0.25) {
      setIsVisible(true);
    }
  }, [intersection, intersection?.intersectionRatio]);

  return isVisible ? (
    children
  ) : (
    <div
      data-test-subj="renderOnlyInViewPlaceholderContainer"
      ref={intersectionRef}
      role="region"
      aria-label={placeholderTitle}
      style={{ height: initialHeight }}
    >
      <EuiSkeletonRectangle />
    </div>
  );
}
