/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import type { FC } from 'react';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useFlyoutApi } from '@kbn/flyout';
import { ALERT_PREVIEW_BANNER } from '../../document_details/preview/constants';
import { DocumentDetailsPreviewPanelKey } from '../../document_details/shared/constants/panel_keys';

interface AlertPreviewButtonProps {
  /**
   * Name of the index used in the parent's page
   */
  indexName: string;
  /**
   * Id of the alert to preview
   */
  id: string;
  /**
   * Data attribute used for testing.
   */
  'data-test-subj'?: string;
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}

/**
 * Icon button showed on tables to launch a preview of the alert details panel.
 */
export const AlertPreviewButton: FC<AlertPreviewButtonProps> = ({
  id,
  indexName,
  'data-test-subj': dataTestSubj,
  scopeId,
}) => {
  const { openChildPanel } = useFlyoutApi();

  const openAlertPreview = useCallback(
    () =>
      openChildPanel(
        {
          id: DocumentDetailsPreviewPanelKey,
          params: {
            id,
            indexName,
            scopeId,
            isChild: true,
            banner: ALERT_PREVIEW_BANNER,
          },
        },
        's'
      ),
    [openChildPanel, id, indexName, scopeId]
  );

  return (
    <EuiButtonIcon
      iconType="expand"
      data-test-subj={dataTestSubj}
      onClick={openAlertPreview}
      aria-label={i18n.translate('xpack.securitySolution.flyout.right.alertPreview.ariaLabel', {
        defaultMessage: 'Preview alert with id {id}',
        values: { id },
      })}
    />
  );
};
