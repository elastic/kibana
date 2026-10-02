/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

/**
 * EUI's `cross`, inlined so it renders on the first paint.
 *
 * `EuiIcon` resolves a string `type` by importing that icon's asset on demand,
 * so a chip that mounts with `iconType="cross"` renders its remove button one
 * tick later — and a filter chip that appears with no visible way to remove it is
 * worse than one that never had one. Passing a component instead takes the
 * synchronous branch in `EuiIcon`, and this keeps the chip's only affordance
 * independent of a network request.
 *
 * The path is EUI's own (`assets/cross`), so the glyph is identical to the
 * string form; the size and fill come from the `EuiIcon` styles it is rendered
 * inside.
 */
export const CrossIcon: FC = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
    width={16}
    height={16}
    fill="currentColor"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M7.293 8 2.646 3.354l.708-.708L8 7.293l4.646-4.647.708.708L8.707 8l4.647 4.646-.707.708L8 8.707l-4.646 4.647-.708-.707L7.293 8Z"
    />
  </svg>
);
