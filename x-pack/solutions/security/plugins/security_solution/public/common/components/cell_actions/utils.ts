/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { TableId } from '@kbn/securitysolution-data-table';
import { ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID } from '../../../timelines/components/row_renderers_browser/constants';

/**
 * Determines if hover actions should be disabled for a given timeline ID
 * @param timelineId - The timeline ID to check
 * @returns true if hover actions should be disabled, false otherwise
 */
export const disableHoverActions = (timelineId: string | undefined): boolean =>
  [TableId.rulePreview, ROW_RENDERER_BROWSER_EXAMPLE_TIMELINE_ID].includes(timelineId ?? '');

/**
 * Only returns true if the specified tooltipContent is exactly `null`.
 * Example input / output:
 * `bob -> false`
 * `undefined -> false`
 * `<span>thing</span> -> false`
 * `null -> true`
 */
export const tooltipContentIsExplicitlyNull = (tooltipContent?: React.ReactNode): boolean =>
  tooltipContent === null; // an explicit / exact null check

/**
 * Derives the tooltip content from the field name if no tooltip was specified
 */
export const getDefaultWhenTooltipIsUnspecified = ({
  field,
  tooltipContent,
}: {
  field: string;
  tooltipContent?: React.ReactNode;
}): React.ReactNode => (tooltipContent != null ? tooltipContent : field);
