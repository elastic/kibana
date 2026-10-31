/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { RumBudgetItem } from '../../../../common/rum_budgets';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { fetchRumBudgets } from '../../../services/rest/rum_budgets_api';
import { useRumBudgetFlyout } from './budget_flyout_context';

export function useRumBudgets() {
  const { http } = useKibanaServices();
  const { revision } = useRumBudgetFlyout();
  const [items, setItems] = useState<RumBudgetItem[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRumBudgets(http);
      setAvailable(result.available);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [http]);

  useEffect(() => {
    void reload();
  }, [reload, revision]);

  return { items, available, loading, error, reload };
}
