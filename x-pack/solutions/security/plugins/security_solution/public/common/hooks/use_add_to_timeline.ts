/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../lib/kibana';
import type { DataProvider } from '../../timelines/components/timeline/data_providers/data_provider';
import { addProvider } from '../../timelines/store/actions';
import { TimelineId } from '../../../common/types/timeline';

/**
 * Hook that returns a callback to add data providers to the active timeline.
 * Shows a success toast notification after adding.
 */
export const useAddToTimeline = (): ((dataProviders: DataProvider[]) => void) => {
  const dispatch = useDispatch();
  const { notifications } = useKibana().services;

  return useCallback(
    (dataProviders: DataProvider[]) => {
      if (!dataProviders.length) {
        return;
      }

      dispatch(
        addProvider({
          id: TimelineId.active,
          providers: dataProviders,
        })
      );

      const title =
        dataProviders.length === 1
          ? i18n.translate('xpack.securitySolution.timeline.addedToTimelineTitle', {
              values: { fieldOrValue: dataProviders[0].name },
              defaultMessage: 'Added {fieldOrValue} to Timeline',
            })
          : i18n.translate('xpack.securitySolution.timeline.addedMultipleToTimelineTitle', {
              values: { count: dataProviders.length },
              defaultMessage: 'Added {count} items to Timeline',
            });

      notifications.toasts.addSuccess({ title });
    },
    [dispatch, notifications.toasts]
  );
};
