/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import React from 'react';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { PortOrServiceNameLink } from '../../../../common/components/links';

export const Port = React.memo<{
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon;
  title?: string;
  value: string | undefined | null;
}>(({ Component, title, value }) => (
  <PortOrServiceNameLink
    portOrServiceName={value || getEmptyValue()}
    Component={Component}
    title={title}
  />
));

Port.displayName = 'Port';
