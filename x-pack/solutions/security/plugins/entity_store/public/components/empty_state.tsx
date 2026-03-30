/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiButton,
  EuiCallOut,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { useInstallEntityStore, useCheckPrivileges } from '../hooks/use_entity_store_api';

export const EntityStoreEmptyState = () => {
  const installMutation = useInstallEntityStore();
  const { data: privileges, isLoading: privilegesLoading } = useCheckPrivileges();
  const [installError, setInstallError] = useState<string | null>(null);

  const hasPrivileges = privileges?.has_all_required ?? false;

  const handleInstall = async () => {
    setInstallError(null);
    try {
      await installMutation.mutateAsync({});
    } catch (e) {
      setInstallError(e instanceof Error ? e.message : String(e));
    }
  };

  if (privilegesLoading) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingSpinner size="xl" />}
        title={<h2>Checking permissions...</h2>}
      />
    );
  }

  return (
    <EuiEmptyPrompt
      iconType="database"
      title={<h2>Entity Store</h2>}
      body={
        <>
          <EuiText>
            <p>
              The Entity Store extracts and maintains entity records from your security logs. It
              creates enriched entity profiles for users, hosts, and services that power risk
              scoring, anomaly detection, and entity analytics.
            </p>
          </EuiText>
          {!hasPrivileges && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut title="Insufficient privileges" color="warning" iconType="warning">
                <p>
                  You do not have the required privileges to enable the Entity Store. Contact your
                  administrator.
                </p>
              </EuiCallOut>
            </>
          )}
          {installError && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut title="Installation failed" color="danger" iconType="error">
                <p>{installError}</p>
              </EuiCallOut>
            </>
          )}
        </>
      }
      actions={
        <EuiButton
          fill
          iconType="plusInCircle"
          onClick={handleInstall}
          isLoading={installMutation.isPending}
          disabled={!hasPrivileges}
        >
          Enable Entity Store
        </EuiButton>
      }
    />
  );
};
