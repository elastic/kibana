/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';

// Without this the URL panel's intrinsic minimum width acts as a floor, so narrow
// viewports push the API key controls outside the page instead of truncating the URL.
export const endpointUrlItemStyle = css`
  min-width: 0;
`;
