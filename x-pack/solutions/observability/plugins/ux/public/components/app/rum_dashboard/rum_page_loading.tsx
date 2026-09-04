/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { EuiProgress } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

type TrackPageLoading = (id: string, loading: boolean) => void;

const TrackPageLoadingContext = createContext<TrackPageLoading>(() => undefined);
const PageLoadingContext = createContext(false);

export function RumPageLoadingProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());

  const track = useCallback<TrackPageLoading>((id, loading) => {
    setPending((current) => {
      const has = current.has(id);
      if (loading === has) {
        return current;
      }
      const next = new Set(current);
      if (loading) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const isLoading = pending.size > 0;

  return (
    <TrackPageLoadingContext.Provider value={track}>
      <PageLoadingContext.Provider value={isLoading}>{children}</PageLoadingContext.Provider>
    </TrackPageLoadingContext.Provider>
  );
}

export function useRumPageLoading(id: string, loading: boolean): void {
  const track = useContext(TrackPageLoadingContext);

  useEffect(() => {
    track(id, loading);
    return () => {
      track(id, false);
    };
  }, [id, loading, track]);
}

export function RumPageLoadingBar() {
  const isLoading = useContext(PageLoadingContext);

  if (!isLoading) {
    return null;
  }

  return (
    <EuiProgress
      size="xs"
      color="accent"
      position="absolute"
      style={{
        top: 'auto',
        insetBlockStart: 'auto',
        bottom: 0,
        insetBlockEnd: 0,
        zIndex: 2,
      }}
      data-test-subj="uxPageLoadingBar"
      aria-label={i18n.translate('xpack.ux.page.loadingAriaLabel', {
        defaultMessage: 'Loading page data',
      })}
    />
  );
}
