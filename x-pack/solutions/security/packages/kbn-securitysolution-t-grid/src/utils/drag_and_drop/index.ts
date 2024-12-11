/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DropResult } from '@hello-pangea/dnd';

export const draggableIdPrefix = 'draggableId';

export const droppableIdPrefix = 'droppableId';

export const draggableContentPrefix = `${draggableIdPrefix}.content.`;

export const draggableTimelineProvidersPrefix = `${draggableIdPrefix}.timelineProviders.`;

export const draggableFieldPrefix = `${draggableIdPrefix}.field.`;

export const droppableContentPrefix = `${droppableIdPrefix}.content.`;

export const droppableFieldPrefix = `${droppableIdPrefix}.field.`;

export const droppableTimelineProvidersPrefix = `${droppableIdPrefix}.timelineProviders.`;

export const droppableTimelineColumnsPrefix = `${droppableIdPrefix}.timelineColumns.`;

export const droppableTimelineFlyoutBottomBarPrefix = `${droppableIdPrefix}.flyoutButton.`;

export const getDraggableId = (dataProviderId: string): string =>
  `${draggableContentPrefix}${dataProviderId}`;

export const getDraggableFieldId = ({
  contextId,
  fieldId,
}: {
  contextId: string;
  fieldId: string;
}): string => `${draggableFieldPrefix}${escapeContextId(contextId)}.${escapeFieldId(fieldId)}`;

export const getTimelineProviderDroppableId = ({
  groupIndex,
  timelineId,
}: {
  groupIndex: number;
  timelineId: string;
}): string => `${droppableTimelineProvidersPrefix}${timelineId}.group.${groupIndex}`;

export const getTimelineProviderDraggableId = ({
  dataProviderId,
  groupIndex,
  timelineId,
}: {
  dataProviderId: string;
  groupIndex: number;
  timelineId: string;
}): string =>
  `${draggableTimelineProvidersPrefix}${timelineId}.group.${groupIndex}.${dataProviderId}`;

export const getDroppableId = (visualizationPlaceholderId: string): string =>
  `${droppableContentPrefix}${visualizationPlaceholderId}`;

export const sourceIsContent = (result: DropResult): boolean =>
  result.source.droppableId.startsWith(droppableContentPrefix);

export const sourceAndDestinationAreSameTimelineProviders = (result: DropResult): boolean => {
  const regex = /^droppableId\.timelineProviders\.(\S+)\./;
  const sourceMatches = result.source.droppableId.match(regex) || [];
  const destinationMatches =
    (result.destination && result.destination.droppableId.match(regex)) || [];

  return (
    sourceMatches.length >= 2 &&
    destinationMatches.length >= 2 &&
    sourceMatches[1] === destinationMatches[1]
  );
};

export const draggableIsContent = (result: DropResult | { draggableId: string }): boolean =>
  result.draggableId.startsWith(draggableContentPrefix);

export const draggableIsField = (result: DropResult | { draggableId: string }): boolean =>
  result.draggableId.startsWith(draggableFieldPrefix);

export const reasonIsDrop = (result: DropResult): boolean => result.reason === 'DROP';

export const destinationIsTimelineProviders = (result: DropResult): boolean =>
  result.destination != null &&
  result.destination.droppableId.startsWith(droppableTimelineProvidersPrefix);

export const destinationIsTimelineColumns = (result: DropResult): boolean =>
  result.destination != null &&
  result.destination.droppableId.startsWith(droppableTimelineColumnsPrefix);

export const destinationIsTimelineButton = (result: DropResult): boolean =>
  result.destination != null &&
  result.destination.droppableId.startsWith(droppableTimelineFlyoutBottomBarPrefix);

export const getProviderIdFromDraggable = (result: DropResult): string =>
  result.draggableId.substring(result.draggableId.lastIndexOf('.') + 1);

export const getFieldIdFromDraggable = (result: DropResult): string =>
  unEscapeFieldId(result.draggableId.substring(result.draggableId.lastIndexOf('.') + 1));

export const escapeDataProviderId = (path: string) => path.replace(/\./g, '_');

export const escapeContextId = (path: string) => path.replace(/\./g, '_');

export const escapeFieldId = (path: string) => path.replace(/\./g, '!!!DOT!!!');

export const unEscapeFieldId = (path: string) => path.replace(/!!!DOT!!!/g, '.');

export const providerWasDroppedOnTimeline = (result: DropResult): boolean =>
  reasonIsDrop(result) &&
  draggableIsContent(result) &&
  sourceIsContent(result) &&
  destinationIsTimelineProviders(result);

export const userIsReArrangingProviders = (result: DropResult): boolean =>
  reasonIsDrop(result) && sourceAndDestinationAreSameTimelineProviders(result);

export const fieldWasDroppedOnTimelineColumns = (result: DropResult): boolean =>
  reasonIsDrop(result) && draggableIsField(result) && destinationIsTimelineColumns(result);

/**
 * Prevents fields from being dragged or dropped to any area other than column
 * header drop zone in the timeline
 */
export const DRAG_TYPE_FIELD = 'drag-type-field';

/** This class is added to the document body while timeline field dragging */
export const IS_TIMELINE_FIELD_DRAGGING_CLASS_NAME = 'is-timeline-field-dragging';
