/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, EuiLink, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TableId } from '@kbn/securitysolution-data-table';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { ToolsFlyoutHeader } from '../../../shared/components/tools_flyout_header';
import { useDocumentFlyoutTitle } from '../../../shared/hooks/use_document_flyout_title';
import { DocumentDetailsContext } from '../../../../flyout/document_details/shared/context';
import { useGetFieldsData } from '../../../../flyout/document_details/shared/hooks/use_get_fields_data';
import {
  EntitiesDetails,
  type EntitySectionOverrideBuilders,
  type EntitySectionOverrides,
} from '../../../../flyout/document_details/left/components/entities_details';
import type { SearchHit } from '../../../../../common/search_strategy';
import { CspInsightLeftPanelSubTab } from '../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { flyoutProviders } from '../../../shared/components/flyout_provider';
import {
  defaultToolsFlyoutProperties,
  useDefaultDocumentFlyoutProperties,
} from '../../../shared/hooks/use_default_flyout_properties';
import { documentFlyoutHistoryKey } from '../../../shared/constants/flyout_history';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../../common/hooks/is_in_security_app';
import { User } from '../../../entity/user/main';
import { Host } from '../../../entity/host/main';
import { AlertsInsights } from '../../../entity/shared/tools/alerts_insights';
import { MisconfigurationInsights } from '../../../entity/shared/tools/misconfiguration_insights';
import { VulnerabilityInsights } from '../../../entity/host/tools/vulnerability_insights';
import { buildFlyoutContent } from '../../../shared/utils/build_flyout_content';
import { ENTITIES_TOOL_TEST_ID } from './test_ids';

export interface EntityDetailsProps {
  /**
   * Alert/event document
   */
  hit: DataTableRecord;
  /**
   * Scope id forwarded to EntitiesDetails via context.
   * Defaults to the alerts page scope.
   */
  scopeId?: string;
}

const TITLE = i18n.translate('xpack.securitySolution.flyout.document.entities.title', {
  defaultMessage: 'Entities',
});

const NOOP_REFETCH = async () => {};

/**
 * Displays the entities details for a given alert/event document.
 */
export const EntityDetails = memo(
  ({ hit, scopeId = TableId.alertsOnAlertsPage }: EntityDetailsProps) => {
    const { euiTheme } = useEuiTheme();
    const { label, iconType, onTitleClick, badge, timestamp } = useDocumentFlyoutTitle({ hit });

    const { getFieldsData } = useGetFieldsData({
      fieldsData: hit.raw.fields as SearchHit['fields'],
    });

    const dataAsNestedObject = useMemo(() => hit.raw._source as unknown as Ecs, [hit.raw._source]);

    const contextValue = useMemo(
      () => ({
        eventId: hit.id,
        indexName: hit.raw._index ?? '',
        scopeId,
        browserFields: {},
        dataAsNestedObject,
        dataFormattedForFieldBrowser: [],
        searchHit: hit.raw as SearchHit,
        investigationFields: [],
        refetchFlyoutData: NOOP_REFETCH,
        getFieldsData,
        isRulePreview: false,
        isPreviewMode: false,
      }),
      [hit.id, hit.raw, scopeId, dataAsNestedObject, getFieldsData]
    );

    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const isInSecurityApp = useIsInSecurityApp();
    const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
    const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

    const openEntityFlyout = useCallback(
      (children: ReactNode) => {
        overlays.openSystemFlyout(flyoutProviders({ services, store, history, children }), {
          ...defaultDocumentFlyoutProperties,
          historyKey,
          session: 'inherit',
          outsideClickCloses: false,
        });
      },
      [overlays, services, store, history, defaultDocumentFlyoutProperties, historyKey]
    );

    const openToolFlyout = useCallback(
      (children: ReactNode) => {
        overlays.openSystemFlyout(flyoutProviders({ services, store, history, children }), {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: 'start',
        });
      },
      [overlays, services, store, history, historyKey]
    );

    // Ref keeps the latest openEntityFlyout without changing the LinkRenderer reference.
    const openEntityFlyoutRef = useRef(openEntityFlyout);
    openEntityFlyoutRef.current = openEntityFlyout;

    const LinkRenderer = useCallback(
      ({ field, value, children }: { field: string; value: string; children?: ReactNode }) => {
        const flyoutContent = buildFlyoutContent(field, value);
        if (!flyoutContent) return <>{children}</>;
        return (
          <EuiLink onClick={() => openEntityFlyoutRef.current(flyoutContent)}>
            {children ?? value}
          </EuiLink>
        );
      },
      []
    );

    const buildUserOverrides = useCallback(
      ({ name, entityId }: { name: string; entityId?: string }): EntitySectionOverrides => ({
        onPreviewEntity: () =>
          openEntityFlyout(
            <User userName={name} entityId={entityId} scopeId={scopeId} hit={hit} />
          ),
        onShowDetailsPanel: (subTab) => {
          switch (subTab) {
            case CspInsightLeftPanelSubTab.ALERTS:
              return openToolFlyout(
                <AlertsInsights entityType={EntityType.user} value={name} entityId={entityId} />
              );
            case CspInsightLeftPanelSubTab.MISCONFIGURATIONS:
              return openToolFlyout(
                <MisconfigurationInsights
                  entityType={EntityType.user}
                  value={name}
                  entityId={entityId}
                />
              );
          }
        },
        linkRenderer: LinkRenderer,
      }),
      [openEntityFlyout, openToolFlyout, scopeId, hit, LinkRenderer]
    );

    const buildHostOverrides = useCallback(
      ({ name, entityId }: { name: string; entityId?: string }): EntitySectionOverrides => ({
        onPreviewEntity: () =>
          openEntityFlyout(
            <Host hostName={name} entityId={entityId} scopeId={scopeId} hit={hit} />
          ),
        onShowDetailsPanel: (subTab) => {
          switch (subTab) {
            case CspInsightLeftPanelSubTab.ALERTS:
              return openToolFlyout(
                <AlertsInsights entityType={EntityType.host} value={name} entityId={entityId} />
              );
            case CspInsightLeftPanelSubTab.MISCONFIGURATIONS:
              return openToolFlyout(
                <MisconfigurationInsights
                  entityType={EntityType.host}
                  value={name}
                  entityId={entityId}
                />
              );
            case CspInsightLeftPanelSubTab.VULNERABILITIES:
              return openToolFlyout(
                <VulnerabilityInsights
                  value={name}
                  entityId={entityId}
                  onShowHost={() =>
                    openEntityFlyout(
                      <Host hostName={name} entityId={entityId} scopeId={scopeId} hit={hit} />
                    )
                  }
                />
              );
          }
        },
        linkRenderer: LinkRenderer,
      }),
      [openEntityFlyout, openToolFlyout, scopeId, hit, LinkRenderer]
    );

    const overrideBuilders = useMemo<EntitySectionOverrideBuilders>(
      () => ({ buildUserOverrides, buildHostOverrides }),
      [buildUserOverrides, buildHostOverrides]
    );

    return (
      <>
        <EuiFlyoutHeader
          hasBorder
          css={css`
            padding-block: ${euiTheme.size.s} !important;
          `}
        >
          <ToolsFlyoutHeader
            title={TITLE}
            onTitleClick={onTitleClick}
            label={label}
            iconType={iconType}
            badge={badge}
            timestamp={timestamp}
          />
        </EuiFlyoutHeader>
        <EuiFlyoutBody data-test-subj={ENTITIES_TOOL_TEST_ID}>
          <DocumentDetailsContext.Provider value={contextValue}>
            <EntitiesDetails {...overrideBuilders} />
          </DocumentDetailsContext.Provider>
        </EuiFlyoutBody>
      </>
    );
  }
);

EntityDetails.displayName = 'EntityDetails';
