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
import { MisconfigurationFindingsDetailsTable } from '../../../../../cloud_security_posture/components/csp_details/misconfiguration_findings_details_table';

const TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entityDetails.misconfigurationInsights.title',
  { defaultMessage: 'Misconfigurations' }
);

const ICON_TYPE = { [EntityType.host]: 'storage', [EntityType.user]: 'user' } as const;
const FIELD = {
  [EntityType.host]: EntityIdentifierFields.hostName,
  [EntityType.user]: EntityIdentifierFields.userName,
} as const;

export interface MisconfigurationInsightsProps {
  /** Whether this tool is scoped to a host or user entity. Controls the icon, query field, and entity type passed to the table. */
  entityType: EntityType.host | EntityType.user;
  /** Field value used to query misconfigurations — `host.name` for hosts, `user.name` for users. */
  value: string;
  /** Canonical Entity Store v2 id (`entity.id`) when already resolved. */
  entityId?: string;
  /** Scope id passed to downstream containers. */
  scopeId: string;
  /** Opens the originating entity flyout as a child. */
  onOpen?: () => void;
}

/**
 * Tool flyout displaying CSP misconfiguration findings for an entity.
 */
export const MisconfigurationInsights = memo(
  ({ entityType, value, entityId, scopeId, onOpen }: MisconfigurationInsightsProps) => {
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
            onTitleClick={onOpen}
            label={value}
            iconType={ICON_TYPE[entityType]}
          />
        </EuiFlyoutHeader>
        <MisconfigurationFindingsDetailsTable
          field={FIELD[entityType]}
          value={value}
          scopeId={scopeId}
          entityId={entityId}
          entityType={entityType}
          onShowFinding={onShowFinding}
        />
      </>
    );
  }
);

MisconfigurationInsights.displayName = 'MisconfigurationInsights';
