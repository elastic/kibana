/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DragStart, DropResult, euiDragDropReorder } from '@elastic/eui';
import { IToasts, Toast } from '@kbn/core/public';
import { RoutingDefinition, WiredStreamGetResponse } from '@kbn/streams-schema';
import React, { useCallback, useEffect } from 'react';
import { useDebounced } from '../../../util/use_debounce';

export interface ChildUnderEdit {
  isNew: boolean;
  child: RoutingDefinition;
}

export function useRoutingState({
  definition,
  toasts,
}: {
  definition?: WiredStreamGetResponse;
  toasts: IToasts;
}) {
  const [lastDisplayedToast, setLastDisplayedToast] = React.useState<Toast | undefined>();

  const [childUnderEdit, setChildUnderEdit] = React.useState<ChildUnderEdit | undefined>();

  const selectChildUnderEdit = useCallback(
    (child: ChildUnderEdit | undefined) => {
      if (lastDisplayedToast) {
        toasts.remove(lastDisplayedToast.id);
      }
      setChildUnderEdit(child);
    },
    [lastDisplayedToast, toasts]
  );

  // Child streams: either represents the child streams as they are, or the new order from drag and drop.
  const [childStreams, setChildStreams] = React.useState<
    WiredStreamGetResponse['stream']['ingest']['routing']
  >(definition?.stream.ingest.routing ?? []);

  useEffect(() => {
    setChildStreams(definition?.stream.ingest.routing ?? []);
  }, [definition]);

  // Note: just uses reference equality to check if the order has changed as onChildStreamReorder will create a new array.
  const hasChildStreamsOrderChanged = childStreams !== definition?.stream.ingest.routing;

  // Child stream currently being dragged
  const [draggingChildStream, setDraggingChildStream] = React.useState<string | undefined>();

  const onChildStreamDragStart = useCallback((e: DragStart) => {
    setDraggingChildStream(e.draggableId);
  }, []);

  const onChildStreamDragEnd = useCallback(
    (event: DropResult) => {
      if (lastDisplayedToast) {
        toasts.remove(lastDisplayedToast.id);
      }
      setDraggingChildStream(undefined);
      if (typeof event.source.index === 'number' && typeof event.destination?.index === 'number') {
        setChildStreams([
          ...euiDragDropReorder(childStreams, event.source.index, event.destination.index),
        ]);
      }
    },
    [childStreams, lastDisplayedToast, toasts]
  );

  const cancelChanges = useCallback(() => {
    setChildUnderEdit(undefined);
    setChildStreams(definition?.stream.ingest.routing ?? []);
  }, [definition?.stream.ingest.routing]);

  const debouncedChildUnderEdit = useDebounced(childUnderEdit, 300);

  const [saveInProgress, setSaveInProgress] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  return {
    setLastDisplayedToast,
    debouncedChildUnderEdit,
    childUnderEdit,
    selectChildUnderEdit,
    saveInProgress,
    setSaveInProgress,
    showDeleteModal,
    setShowDeleteModal,
    childStreams,
    onChildStreamDragEnd,
    hasChildStreamsOrderChanged,
    cancelChanges,
    onChildStreamDragStart,
    draggingChildStream,
  };
}
