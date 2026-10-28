/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiButtonEmpty, EuiIconTip, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { GetEntityStoreStatusResponse } from '@kbn/entity-store/common';
import { useInstallEntityStoreMutation } from '../../../hooks/use_entity_store';
import { useEntityEnginePrivileges } from '../../../hooks/use_entity_engine_privileges';
import { isEngineLoading } from '../helpers';

export function EngineStatusHeaderAction({
  engine,
}: {
  engine: GetEntityStoreStatusResponse['engines'][0] | undefined;
}) {
  const installEntityStoreMutation = useInstallEntityStoreMutation();
  const installEntityStore = () => {
    installEntityStoreMutation.mutate();
  };
  const { data: privileges, isLoading: isLoadingPrivileges } = useEntityEnginePrivileges();
  // Install and reinstall hit the same route, which enforces the install privileges server-side.
  const canInstall = !isLoadingPrivileges && !!privileges?.has_install_permissions;
  const missingPrivilegesTooltip = canInstall ? undefined : (
    <FormattedMessage
      id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.missingInstallPrivilegesToolTip"
      defaultMessage="You don't have the privileges required to install the Entity Store. Ask an administrator to do it."
    />
  );
  const hasUninstalledComponent = engine?.components?.some(({ installed }) => !installed);

  if (installEntityStoreMutation.isLoading || isEngineLoading(engine?.status)) {
    return <EuiLoadingSpinner size="s" />;
  }

  if (!engine) {
    return (
      <EuiToolTip content={missingPrivilegesTooltip}>
        <EuiButtonEmpty onClick={installEntityStore} isDisabled={!canInstall}>
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.installButton"
            defaultMessage="Install"
          />
        </EuiButtonEmpty>
      </EuiToolTip>
    );
  }

  if (hasUninstalledComponent) {
    return (
      <div>
        <EuiToolTip content={missingPrivilegesTooltip}>
          <EuiButtonEmpty
            onClick={installEntityStore}
            iconType="refresh"
            color="warning"
            isDisabled={!canInstall}
          >
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.reinstallButton"
              defaultMessage="Reinstall"
            />
          </EuiButtonEmpty>
        </EuiToolTip>

        <EuiIconTip
          content={
            <FormattedMessage
              id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.reinstallToolTip"
              defaultMessage="The components associated with this entity type are experiencing issues. Reinstall them to restore functionality"
            />
          }
          color="warning"
          position="right"
          type="info"
        />
      </div>
    );
  }

  return null;
}
