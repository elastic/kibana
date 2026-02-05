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
import { useKibana } from '../../../common/lib/kibana';
import { FLYOUT_PREVIEW_LINK_TEST_ID } from './test_ids';
import { DocumentEventTypes } from '../../../common/lib/telemetry';
import { getPreviewPanelParams } from '../utils/link_utils';
import type { EntityIdentifiers } from '../../document_details/shared/utils';

interface PreviewLinkProps {
  /**
   * Entity identifiers - key-value pairs of field names and their values
   */
  entityIdentifiers: EntityIdentifiers;
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
}

/**
 * Renders a link that opens a preview panel
 * If the field is not previewable, the link will not be rendered
 */
export const PreviewLink: FC<PreviewLinkProps> = ({
  entityIdentifiers,
  scopeId,
  ruleId,
  children,
  ancestorsIndexName,
  'data-test-subj': dataTestSubj = FLYOUT_PREVIEW_LINK_TEST_ID,
}) => {
  const { openPreviewPanel } = useExpandableFlyoutApi();
  const { telemetry } = useKibana().services;

  // Extract primary field and value from entityIdentifiers
  const primaryField = useMemo(() => {
    if (entityIdentifiers['host.name']) return 'host.name';
    if (entityIdentifiers['user.name']) return 'user.name';
    return Object.keys(entityIdentifiers)[0];
  }, [entityIdentifiers]);

  const primaryValue = useMemo(() => {
    return primaryField ? entityIdentifiers[primaryField] : '';
  }, [entityIdentifiers, primaryField]);

  const previewParams = useMemo(
    () =>
      getPreviewPanelParams({
        entityIdentifiers,
        scopeId,
        ruleId,
        ancestorsIndexName,
      }),
    [entityIdentifiers, scopeId, ruleId, ancestorsIndexName]
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
