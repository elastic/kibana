/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import React from 'react';

import type { RowRenderer } from '../../../../../../../common/types/timeline';
import { RowRendererIdEnum } from '../../../../../../../common/api/timeline';

import { RowRendererContainer } from '../row_renderer';
import { ZeekDetails } from './zeek_details';

export const zeekRowRenderer: RowRenderer = {
  id: RowRendererIdEnum.zeek,
  isInstance: (ecs) => {
    const module: string | null | undefined = get('event.module[0]', ecs);
    return module != null && module.toLowerCase() === 'zeek';
  },
  renderRow: ({ data, scopeId }) => (
    <RowRendererContainer>
      <ZeekDetails data={data} timelineId={scopeId} />
    </RowRendererContainer>
  ),
};
