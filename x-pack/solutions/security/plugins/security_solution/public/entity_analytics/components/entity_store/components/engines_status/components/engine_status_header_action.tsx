/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiButtonEmpty, EuiIconTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityType, GetEntityStoreStatusResponse } from '@kbn/entity-store/common';
import { useInstallEntityEngineMutation } from '../../../hooks/use_entity_store';
import { isEngineLoading } from '../helpers';

export function EngineStatusHeaderAction({
  engine,
  entityType,
}: {
  engine: GetEntityStoreStatusResponse['engines'][0] | undefined;
  entityType: EntityType;
}) {
  const installEntityEngineMutation = useInstallEntityEngineMutation();
  const installEntityEngine = () => {
    installEntityEngineMutation.mutate(entityType);
  };
  const hasUninstalledComponent = engine?.components?.some(({ installed }) => !installed);

  if (installEntityEngineMutation.isLoading || isEngineLoading(engine?.status)) {
    return <EuiLoadingSpinner size="s" />;
  }

  if (!engine) {
    return (
      <EuiButtonEmpty onClick={installEntityEngine}>
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.installButton"
          defaultMessage="Install"
        />
      </EuiButtonEmpty>
    );
  }

  if (hasUninstalledComponent) {
    return (
      <div>
        <EuiButtonEmpty onClick={installEntityEngine} iconType="refresh" color="warning">
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.entityStore.enginesStatus.reinstallButton"
            defaultMessage="Reinstall"
          />
        </EuiButtonEmpty>

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
