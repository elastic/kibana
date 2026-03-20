/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiLink } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { useKibana, useUiSetting } from '../../../common/lib/kibana';
import { FLYOUT_PREVIEW_LINK_TEST_ID } from './test_ids';
import { DocumentEventTypes } from '../../../common/lib/telemetry';
import { getPreviewPanelParams } from '../utils/link_utils';
import type { IdentityFields } from '../../document_details/shared/utils';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../common/entity_analytics/entity_store/constants';
import { useEntityFromStore } from '../../entity_details/shared/hooks/use_entity_from_store';
import {
  HOST_NAME_FIELD_NAME,
  USER_NAME_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';

interface PreviewLinkProps {
  /**
   * Entity identifiers - key-value pairs of field names and their values
   */
  identityFields: IdentityFields;
  /**
   * Scope id to use for the preview panel
   */
  scopeId: string;
  /**
   * Rule id to use for the preview panel
   */
  ruleId?: string;
  /**
   * Optional data-test-subj value
   */
  ['data-test-subj']?: string;
  /**
   * React components to render, if none provided, the value will be rendered
   */
  children?: React.ReactNode;
  /**
   * The indexName to be passed to the flyout preview panel
   * when clicking on "Source event" id
   */
  ancestorsIndexName?: string;
  /**
   * When identityFields contain both host and user fields (e.g. from document context),
   * use this to force which entity flyout (host vs user) to open. E.g. in Prevalence tab
   * user.name row should open user flyout even when identifiers include host fields.
   */
  preferredField?: 'host.name' | 'user.name';
}

/**
 * Renders a link that opens a preview panel
 * If the field is not previewable, the link will not be rendered
 */
export const PreviewLink: FC<PreviewLinkProps> = ({
  identityFields,
  scopeId,
  ruleId,
  children,
  ancestorsIndexName,
  preferredField,
  'data-test-subj': dataTestSubj = FLYOUT_PREVIEW_LINK_TEST_ID,
}) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();
  const { telemetry } = useKibana().services;
  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  // Extract primary field and value from identityFields.
  // When preferredField is set (e.g. from Prevalence tab), use it so the correct entity flyout opens
  // even when identityFields include both host and user fields.
  const primaryField = useMemo(() => {
    if (
      preferredField &&
      (preferredField === 'host.name' || preferredField === 'user.name') &&
      identityFields[preferredField]
    ) {
      return preferredField;
    }
    if (identityFields['host.name']) return 'host.name';
    if (identityFields['user.name']) return 'user.name';
    return Object.keys(identityFields)[0] ?? '';
  }, [identityFields, preferredField]);

  const primaryValue = useMemo(() => {
    return primaryField ? identityFields[primaryField] : '';
  }, [identityFields, primaryField]);

  const isHostOrUser =
    primaryField === HOST_NAME_FIELD_NAME || primaryField === USER_NAME_FIELD_NAME;
  const entityType = primaryField === HOST_NAME_FIELD_NAME ? 'host' : 'user';

  const docEntityId =
    entityType === 'host' ? identityFields['host.entity.id'] : identityFields['user.entity.id'];

  const { entityRecord } = useEntityFromStore({
    entityId: docEntityId,
    identityFields,
    entityType,
    skip: !entityStoreV2Enabled || !isHostOrUser || Object.keys(identityFields).length === 0,
  });

  const resolvedEntityId = entityRecord?.entity?.id;

  const previewParams = useMemo(
    () =>
      getPreviewPanelParams({
        identityFields,
        entityId: resolvedEntityId,
        field: primaryField,
        value: primaryValue,
        scopeId,
        ruleId,
        ancestorsIndexName,
      }),
    [
      identityFields,
      resolvedEntityId,
      primaryField,
      primaryValue,
      scopeId,
      ruleId,
      ancestorsIndexName,
    ]
  );

  const onClick = useCallback(() => {
    if (previewParams) {
      openPreviewPanel({
        id: previewParams.id,
        params: previewParams.params,
      });
      telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
        location: scopeId,
        panel: 'preview',
      });
    }
  }, [scopeId, telemetry, openPreviewPanel, previewParams]);

  return previewParams ? (
    <EuiLink onClick={onClick} data-test-subj={dataTestSubj}>
      {children ?? primaryValue}
    </EuiLink>
  ) : (
    <>{children ?? primaryValue}</>
  );
};
