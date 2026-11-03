/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import type { RumAlertTemplateId, RumAlertVital } from '../../../../common/rum_alerts';
import { CreateAlertFlyout } from './create_alert_flyout';

export interface RumAlertDraft {
  templateId: RumAlertTemplateId;
  threshold?: number;
  vital?: RumAlertVital;
  errorType?: string;
  errorMessage?: string;
  pageUrl?: string;
}

interface RumAlertFlyoutApi {
  open: (draft: RumAlertDraft) => void;
}

const RumAlertFlyoutContext = createContext<RumAlertFlyoutApi>({
  open: () => undefined,
});

export const useRumAlertFlyout = (): RumAlertFlyoutApi => useContext(RumAlertFlyoutContext);

export function RumAlertFlyoutProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<RumAlertDraft | null>(null);
  const api = useMemo<RumAlertFlyoutApi>(() => ({ open: setDraft }), []);
  return (
    <RumAlertFlyoutContext.Provider value={api}>
      {children}
      {draft && <CreateAlertFlyout draft={draft} onClose={() => setDraft(null)} />}
    </RumAlertFlyoutContext.Provider>
  );
}
