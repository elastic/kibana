/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import classNames from 'classnames';

/**
 * Returns the css classnames that should be applied when the collapsible card is NOT expanded
 * @param expanded
 */
export const useCollapsedCssClassNames = (expanded?: boolean): string => {
  return useMemo(() => {
    return classNames({
      'eui-textTruncate': !expanded,
    });
  }, [expanded]);
};
