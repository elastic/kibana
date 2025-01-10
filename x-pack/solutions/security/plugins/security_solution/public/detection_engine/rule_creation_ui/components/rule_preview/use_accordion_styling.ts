/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiPaddingSize } from '@elastic/eui';

export const useAccordionStyling = () => {
  const paddingLarge = useEuiPaddingSize('l');
  const paddingSmall = useEuiPaddingSize('s');

  return `padding-bottom: ${paddingLarge};
          padding-top: ${paddingSmall};`;
};
