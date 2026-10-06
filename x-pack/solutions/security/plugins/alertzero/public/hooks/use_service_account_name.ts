/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { buildServiceAccountUrl } from '@kbn/alertzero-common';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

/**
 * The display name for a stored service account id. The id is opaque (`kibana/az-worker-1`);
 * callers that only persisted it still need the name. Undefined until the lookup succeeds.
 */
export const useServiceAccountName = (serviceAccountId?: string): string | undefined => {
  const { services } = useKibana<CoreStart>();
  const [resolved, setResolved] = useState<{ id: string; name: string }>();

  useEffect(() => {
    if (!serviceAccountId) return;
    const pending = services.http.get<{ id: string; name: string }>(
      buildServiceAccountUrl(serviceAccountId)
    );
    let active = true;
    void pending
      .then((account) => {
        if (active && account?.id === serviceAccountId && account.name) {
          setResolved({ id: account.id, name: account.name });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [serviceAccountId, services.http]);

  if (!serviceAccountId || resolved?.id !== serviceAccountId) return undefined;
  return resolved.name;
};
