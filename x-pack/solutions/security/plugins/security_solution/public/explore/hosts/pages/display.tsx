/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from '@emotion/styled';

export const Display = styled.div<{ show: boolean }>(({ show }) => ({
  display: show ? undefined : 'none',
}));

Display.displayName = 'Display';
