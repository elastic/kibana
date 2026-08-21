/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { filter } from 'rxjs';

import type { EventsServiceStartContract } from '@kbn/agent-builder-browser/events';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { RoundCompleteEventData } from '@kbn/agent-builder-common/chat/events';

interface UseRoundCompleteParams {
  eventsService: EventsServiceStartContract | undefined;
  onRoundComplete: (data: RoundCompleteEventData) => void;
}

export const useRoundComplete = ({
  eventsService,
  onRoundComplete,
}: UseRoundCompleteParams): void => {
  const onRoundCompleteRef = useRef(onRoundComplete);
  onRoundCompleteRef.current = onRoundComplete;

  useEffect(() => {
    if (eventsService == null) {
      return;
    }

    const subscription = eventsService.chat$
      .pipe(filter(isRoundCompleteEvent))
      .subscribe((event) => {
        onRoundCompleteRef.current(event.data);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [eventsService]);
};
