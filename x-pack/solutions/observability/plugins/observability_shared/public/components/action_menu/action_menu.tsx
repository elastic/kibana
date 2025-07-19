/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiPopoverProps } from '@elastic/eui';
import { EuiPopover, EuiHorizontalRule } from '@elastic/eui';
import type { HTMLAttributes } from 'react';
import React from 'react';

type Props = EuiPopoverProps & HTMLAttributes<HTMLDivElement>;

export function ActionMenuDivider() {
  return <EuiHorizontalRule margin={'s'} />;
}

export function ActionMenu(props: Props) {
  return <EuiPopover {...props} ownFocus={true} />;
}
