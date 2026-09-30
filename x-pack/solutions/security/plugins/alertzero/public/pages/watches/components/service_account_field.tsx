/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiSelect } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import * as settingsI18n from '../settings_translations';

const CURRENT_USER_VALUE = '';
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

interface ServiceAccountListEntry {
  id: string;
  name: string;
  enabled: boolean;
  assumable: boolean;
}

interface ServiceAccountListResponse {
  serviceAccounts: ServiceAccountListEntry[];
  nextPage?: string;
}

interface ServiceAccountFieldProps {
  workerId: string;
  workerName: string;
  current?: string;
  isDisabled?: boolean;
  fullWidth?: boolean;
  /** Overrides the per-worker aria label when one control covers several workers. */
  ariaLabel?: string;
  onChange: (serviceAccountId: string | null, accountName?: string) => void;
}

/**
 * Lists assumable service accounts. An empty selection clears `serviceAccountId`.
 */
const ServiceAccountFieldComponent: React.FC<ServiceAccountFieldProps> = ({
  workerId,
  workerName,
  current,
  isDisabled,
  fullWidth,
  ariaLabel,
  onChange,
}) => {
  const {
    services: { http },
  } = useKibana<CoreStart>();
  const [accounts, setAccounts] = useState<ServiceAccountListEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const collected: ServiceAccountListEntry[] = [];
      let after: string | undefined;
      for (let page = 0; page < MAX_PAGES; page++) {
        const response = await http.get<ServiceAccountListResponse>(
          '/internal/security/service_account',
          { query: { limit: PAGE_SIZE, ...(after ? { after } : {}) } }
        );
        collected.push(...response.serviceAccounts);
        if (!response.nextPage) {
          break;
        }
        after = response.nextPage;
      }
      if (!cancelled) {
        setAccounts(collected);
      }
    };

    load().catch(() => {
      if (!cancelled) {
        setAccounts([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [http]);

  const selectable = (accounts ?? []).filter((account) => account.enabled && account.assumable);
  const options = [
    { value: CURRENT_USER_VALUE, text: settingsI18n.SERVICE_ACCOUNT_CURRENT_USER },
    ...selectable.map((account) => ({ value: account.id, text: account.name })),
  ];
  if (current && !selectable.some((account) => account.id === current)) {
    options.push({ value: current, text: current });
  }

  return (
    <EuiSelect
      aria-label={ariaLabel ?? settingsI18n.serviceAccountSelectAriaLabel(workerName)}
      data-test-subj={`alertZeroServiceAccountSelect-${workerId}`}
      disabled={isDisabled}
      fullWidth={fullWidth}
      isLoading={accounts === null}
      options={options}
      value={current ?? CURRENT_USER_VALUE}
      onChange={(event) => {
        const value = event.target.value;
        if (value === CURRENT_USER_VALUE) {
          onChange(null);
          return;
        }
        const account = selectable.find((entry) => entry.id === value);
        onChange(value, account?.name ?? value);
      }}
    />
  );
};

export const ServiceAccountField = React.memo(ServiceAccountFieldComponent);
