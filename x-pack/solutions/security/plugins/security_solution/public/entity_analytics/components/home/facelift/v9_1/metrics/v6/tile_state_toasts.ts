/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useKibana } from '../../../../../../../common/lib/kibana';
import type { SignalCardId } from '../../data';
import type { PrototypeStates } from '../../prototype_states';
import type { FaceliftTimeRangeId } from '../../time_range';
import { OVER_LIMIT_CARD_ID, OVER_LIMIT_COUNT, TABLE_ENTITY_LIMIT } from './tile_states';

const TIMEOUT_TEXT =
  'Their queries ran for more than 90 seconds and were stopped. Try a shorter time range or narrower filters.';

/**
 * Toasts for the simulated error states, as security-team#20452 lists them
 * (Today) or merged into one page toast (Proposed). Count toasts fire when the
 * state is picked and again for each new time range; the over-1,000 toast
 * (both variants) fires when the affected tile is selected.
 */
export const usePrototypeStateToasts = ({
  states,
  timeRange,
  selectedCardId,
}: {
  states: PrototypeStates;
  timeRange: FaceliftTimeRangeId;
  selectedCardId: SignalCardId | undefined;
}) => {
  const { notifications } = useKibana().services;
  const { error } = states;
  const proposed = states.variants.error === 'proposed';

  useEffect(() => {
    const toasts = notifications?.toasts;
    if (!toasts) return;

    if (error === 'countFails') {
      if (proposed) {
        toasts.addDanger({
          title: "Some metrics couldn't load",
          text: "Severely alerting, Watchlisted & alerting and New & alerting didn't load. Refresh the page to try again.",
        });
      } else {
        // One toast per failed tile; both alert tiles share the same copy.
        toasts.addDanger({ title: 'There was an error loading entity alert data' });
        toasts.addDanger({ title: 'There was an error loading entity alert data' });
        toasts.addDanger({ title: 'There was an error loading new entity data' });
      }
    }

    if (error === 'countTimeout') {
      toasts.addWarning({
        title: proposed ? 'Some metrics timed out' : 'Some tiles timed out',
        text: TIMEOUT_TEXT,
      });
    }
  }, [error, notifications, proposed, timeRange]);

  useEffect(() => {
    const toasts = notifications?.toasts;
    if (!toasts || error !== 'over1000' || selectedCardId !== OVER_LIMIT_CARD_ID) {
      return;
    }
    toasts.addWarning({
      title: `Table shows ${TABLE_ENTITY_LIMIT.toLocaleString()} of ${OVER_LIMIT_COUNT.toLocaleString()} entities`,
      text: `The table is limited to ${TABLE_ENTITY_LIMIT.toLocaleString()} entities from this tile. Narrow the time range or filters to see a smaller set.`,
    });
  }, [error, notifications, selectedCardId]);
};
