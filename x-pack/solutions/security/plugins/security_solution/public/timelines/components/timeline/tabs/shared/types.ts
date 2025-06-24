/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type React from 'react';
import type { CellValueElementProps } from '../../cell_rendering';
import type { RowRenderer } from '../../../../../../common/types/timeline';

export interface TimelineTabCommonProps {
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  timelineId: string;
}
