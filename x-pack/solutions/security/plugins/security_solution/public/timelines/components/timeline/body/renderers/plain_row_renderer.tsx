/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { RowRenderer } from '../../../../../../common/types/timeline';
import { RowRendererIdEnum } from '../../../../../../common/api/timeline';

const PlainRowRenderer = () => <></>;

PlainRowRenderer.displayName = 'PlainRowRenderer';

export const plainRowRenderer: RowRenderer = {
  id: RowRendererIdEnum.plain,
  isInstance: (_) => true,
  renderRow: PlainRowRenderer,
};
