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
import { noop } from 'lodash/fp';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import {
  EntityIdentifierFields,
  EntityType,
} from '../../../../../../common/entity_analytics/types';
import { ToolsFlyoutHeader } from '../../../../shared/components/tools_flyout_header';
import { EntityIconByType } from '../../../../../entity_analytics/components/entity_store/entity_icon_by_type';
import { AlertsDetailsTable } from '../../../../../cloud_security_posture/components/csp_details/alerts_findings_details_table';
import type { CloudPostureEntityIdentifier } from '../../../../../cloud_security_posture/components/entity_insight';
import { useKibana } from '../../../../../common/lib/kibana';
import { flyoutProviders } from '../../../../shared/components/flyout_provider';
import { useDefaultDocumentFlyoutProperties } from '../../../../shared/hooks/use_default_flyout_properties';
import { DocumentFlyoutWrapper } from '../../../../document/main/document_flyout_wrapper';
import { cellActionRenderer } from '../../../../shared/components/cell_actions';
import { useIsInSecurityApp } from '../../../../../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from '../../../../shared/constants/flyout_history';
import { ALERTS_INSIGHTS_TOOL_TEST_ID } from './test_ids';

const TITLE = i18n.translate('xpack.securitySolution.flyout.entityDetails.alertsInsights.title', {
  defaultMessage: 'Alerts',
});

const ICON_TYPE = EntityIconByType;
const FIELD: Record<
  EntityType.host | EntityType.user | EntityType.generic,
  CloudPostureEntityIdentifier
> = {
  [EntityType.host]: EntityIdentifierFields.hostName,
  [EntityType.user]: EntityIdentifierFields.userName,
  // `related.entity` carries the entity id used to filter alerts for generic entities.
  [EntityType.generic]: 'related.entity',
};

export interface AlertsInsightsProps {
  /** Which entity type this tool is scoped to. Controls the icon, query field, and entity type passed to the table. */
  entityType: EntityType.host | EntityType.user | EntityType.generic;
  /** Field value used to query alerts — e.g. `host.name` for hosts, the entity id for generic. */
  value: string;
  /** Canonical Entity Store v2 id (`entity.id`) when already resolved. */
  entityId?: string;
  /** Opens the originating entity flyout as a child. */
  onShowEntity?: () => void;
}

export const AlertsInsights = memo(
  ({ entityType, value, entityId, onShowEntity }: AlertsInsightsProps) => {
    const { services } = useKibana();
    const store = useStore();
    const history = useHistory();
    const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();
    const isInSecurityApp = useIsInSecurityApp();
    const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;

    const onExpandAlert = useCallback(
      (eventId: string, indexName: string) => {
        services.overlays.openSystemFlyout(
          flyoutProviders({
            services,
            store,
            history,
            children: (
              <DocumentFlyoutWrapper
                documentId={eventId}
                indexName={indexName}
                renderCellActions={cellActionRenderer}
                onAlertUpdated={noop}
              />
            ),
          }),
          {
            ...defaultFlyoutProperties,
            historyKey,
            session: 'inherit',
          }
        );
      },
      [services, store, history, defaultFlyoutProperties, historyKey]
    );

    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <ToolsFlyoutHeader
            title={TITLE}
            onTitleClick={onShowEntity}
            label={value}
            iconType={ICON_TYPE[entityType]}
          />
        </EuiFlyoutHeader>
        <div className="eui-yScroll" data-test-subj={ALERTS_INSIGHTS_TOOL_TEST_ID}>
          <AlertsDetailsTable
            field={FIELD[entityType]}
            value={value}
            entityId={entityId}
            // The alerts table only resolves host/user entity types; for generic it relies on
            // the `field`/`value` filter (`related.entity`) instead.
            entityType={
              entityType === EntityType.host || entityType === EntityType.user
                ? entityType
                : undefined
            }
            onShowAlert={onExpandAlert}
          />
        </div>
      </>
    );
  }
);

AlertsInsights.displayName = 'AlertsInsights';
