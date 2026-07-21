/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { memo, useMemo } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { TableId } from '@kbn/securitysolution-data-table';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { ToolsFlyoutHeader } from '../../../shared/components/tools_flyout_header';
import { useDocumentFlyoutTitle } from '../../../shared/hooks/use_document_flyout_title';
import { useEntityFlyoutOverrides } from '../../../shared/hooks/use_entity_flyout_overrides';
import { DocumentDetailsContext } from '../../../../flyout/document_details/shared/context';
import { useGetFieldsData } from '../../../../flyout/document_details/shared/hooks/use_get_fields_data';
import { EntitiesDetails } from '../../../../flyout/document_details/left/components/entities_details';
import type { SearchHit } from '../../../../../common/search_strategy';
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

    const overrideBuilders = useEntityFlyoutOverrides({ scopeId, hit });

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
