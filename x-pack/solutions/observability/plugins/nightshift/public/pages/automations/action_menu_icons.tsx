/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { icon as copy } from '@elastic/eui/es/components/icon/assets/copy';
import { icon as trash } from '@elastic/eui/es/components/icon/assets/trash';

// A named icon type fetches its SVG after the menu opens. The component is
// already in the bundle, so Clone and Delete paint with the menu.
export const cloneActionIcon = <EuiIcon type={copy} size="m" color="inherit" aria-hidden={true} />;
export const deleteActionIcon = (
  <EuiIcon type={trash} size="m" color="inherit" aria-hidden={true} />
);
