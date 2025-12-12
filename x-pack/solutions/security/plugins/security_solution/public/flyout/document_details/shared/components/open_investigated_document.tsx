/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useFlyoutApi } from '@kbn/flyout';
import { DocumentDetailsRightPanelKey } from '../constants/panel_keys';

const OPEN_INVESTIGATED_DOCUMENT = i18n.translate(
  'xpack.securitySolution.flyout.header.openInvestigatedDocument.buttonLabel',
  {
    defaultMessage: 'Open investigated document',
  }
);

interface AlertCountInsightProps {
  /**
   *
   */
  eventId: string;
  /**
   *
   */
  indexName: string;
  /**
   *
   */
  scopeId: string;
}

/*
 * Displays a distribution bar with the total alert count for a given entity
 */
export const OpenInvestigatedDocument: React.FC<AlertCountInsightProps> = ({
  eventId,
  indexName,
  scopeId,
}) => {
  const { openChildPanel } = useFlyoutApi();

  const openInvestigatedDocument = useCallback(() => {
    openChildPanel({
      id: DocumentDetailsRightPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
        isChild: true,
        isPreview: false,
      },
    });
  }, [eventId, indexName, openChildPanel, scopeId]);

  return (
    <EuiButtonEmpty iconSide="left" iconType="expand" onClick={openInvestigatedDocument} size="xs">
      {OPEN_INVESTIGATED_DOCUMENT}
    </EuiButtonEmpty>
  );
};

OpenInvestigatedDocument.displayName = 'OpenInvestigatedDocument';
