/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiFlyoutHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import {
  EntityIdentifierFields,
  EntityType,
} from '../../../../../../common/entity_analytics/types';
import { useKibana } from '../../../../../common/lib/kibana';
import { flyoutProviders } from '../../../../shared/components/flyout_provider';
import { useDefaultDocumentFlyoutProperties } from '../../../../shared/hooks/use_default_flyout_properties';
import { MisconfigurationPanel } from '../../../../csp_details/misconfiguration_panel';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { MisconfigurationFindingsDetailsTable } from '../../../../../cloud_security_posture/components/flyout_v2/csp_details/misconfiguration_findings_details_table';

const TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.host.misconfigurationInsights.title',
  { defaultMessage: 'Misconfigurations' }
);

export interface MisconfigurationInsightsProps {
  /** The host name used to query misconfigurations (`host.name` field value). */
  value: string;
  /** Canonical Entity Store v2 id (`entity.id`) when already resolved. */
  entityId?: string;
  /** Scope id passed to downstream containers. */
  scopeId: string;
  /** Opens the originating host flyout as a child. */
  onOpenHost?: () => void;
}

/**
 * Tool flyout displaying CSP misconfiguration findings for a host entity.
 */
export const MisconfigurationInsights = memo(
  ({ value, entityId, scopeId, onOpenHost }: MisconfigurationInsightsProps) => {
    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

    const onShowFinding = useCallback(
      (resourceId: string, ruleId: string) => {
        overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: <MisconfigurationPanel resourceId={resourceId} ruleId={ruleId} />,
          }),
          { ...defaultDocumentFlyoutProperties, title: value, session: 'inherit' }
        );
      },
      [overlays, services, store, history, defaultDocumentFlyoutProperties, value]
    );

    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <ToolsFlyoutHeader
            title={TITLE}
            onTitleClick={onOpenHost}
            label={value}
            iconType="storage"
          />
        </EuiFlyoutHeader>
        <MisconfigurationFindingsDetailsTable
          field={EntityIdentifierFields.hostName}
          value={value}
          scopeId={scopeId}
          entityId={entityId}
          entityType={EntityType.host}
          onShowFinding={onShowFinding}
        />
      </>
    );
  }
);

MisconfigurationInsights.displayName = 'MisconfigurationInsights';
