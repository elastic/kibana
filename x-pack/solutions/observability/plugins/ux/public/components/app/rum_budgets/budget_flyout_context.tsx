/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import type { RumBudgetTemplateId } from '../../../../common/rum_budgets';
import { CreateBudgetFlyout } from './create_budget_flyout';

export interface RumBudgetDraft {
  templateId: RumBudgetTemplateId;
  threshold?: number;
  pageUrl?: string;
}

interface RumBudgetFlyoutApi {
  open: (draft: RumBudgetDraft) => void;
  revision: number;
}

const RumBudgetFlyoutContext = createContext<RumBudgetFlyoutApi>({
  open: () => undefined,
  revision: 0,
});

export const useRumBudgetFlyout = (): RumBudgetFlyoutApi => useContext(RumBudgetFlyoutContext);

export function RumBudgetFlyoutProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<RumBudgetDraft | null>(null);
  const [revision, setRevision] = useState(0);
  const api = useMemo<RumBudgetFlyoutApi>(() => ({ open: setDraft, revision }), [revision]);
  return (
    <RumBudgetFlyoutContext.Provider value={api}>
      {children}
      {draft && (
        <CreateBudgetFlyout
          draft={draft}
          onClose={() => setDraft(null)}
          onCreated={() => {
            setDraft(null);
            setRevision((current) => current + 1);
          }}
        />
      )}
    </RumBudgetFlyoutContext.Provider>
  );
}
