/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonIconProps } from '@elastic/eui';

/** Shared sizing / color / display for API endpoint code-block toolbar `EuiButtonIcon`s. */
export const API_ENDPOINT_CODE_TOOLBAR_BUTTON_PROPS: Pick<
  EuiButtonIconProps,
  'color' | 'display' | 'size' | 'iconSize'
> = {
  color: 'text',
  display: 'base',
  size: 'xs',
  iconSize: 's',
};
