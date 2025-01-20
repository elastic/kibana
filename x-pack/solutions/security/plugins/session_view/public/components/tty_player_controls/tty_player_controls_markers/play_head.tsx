/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';

interface SVGRProps {
  title?: string;
  titleId?: string;
}

/**
 * Custom component for replacing the thumb of an input of type range
 */
export const PlayHead = ({
  title,
  titleId,
  ...props
}: React.SVGProps<SVGSVGElement> & SVGRProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={9}
    height={30}
    viewBox="0 0 9 30"
    aria-labelledby={titleId}
    {...props}
  >
    {title ? <title id={titleId}>{title}</title> : null}
    <path d="M1.122-.001A.5.5 0 0 0 .75.834L4 4.444V29.5a.5.5 0 1 0 1 0V4.443L8.248.833A.5.5 0 0 0 7.877 0H1.122Z" />
  </svg>
);
