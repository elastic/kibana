/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { Filter } from '@kbn/es-query';

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { ColumnHeaderOptions, RowRenderer } from '../../../../../../common/types';
import type { TimelineNonEcsData } from '../../../../../../common/search_strategy/timeline';
import type { AlertsUserProfilesData } from '../../../../../detections/configurations/security_solution_detections/fetch_page_context';

export interface ColumnRenderer {
  isInstance: (
    columnName: string,
    data: TimelineNonEcsData[],
    context?: AlertsUserProfilesData
  ) => boolean;
  renderColumn: ({
    className,
    columnName,
    eventId,
    field,
    globalFilters,
    isDetails,
    linkValues,
    rowRenderers,
    scopeId,
    truncate,
    values,
    key,
    context,
  }: {
    asPlainText?: boolean;
    className?: string;
    columnName: string;
    ecsData?: Ecs;
    eventId?: string;
    field: ColumnHeaderOptions;
    globalFilters?: Filter[];
    isDetails?: boolean;
    linkValues?: string[] | null | undefined;
    rowRenderers?: RowRenderer[];
    scopeId: string;
    truncate?: boolean;
    values: string[] | null | undefined;
    key?: string;
    context?: AlertsUserProfilesData;
  }) => React.ReactNode;
}
