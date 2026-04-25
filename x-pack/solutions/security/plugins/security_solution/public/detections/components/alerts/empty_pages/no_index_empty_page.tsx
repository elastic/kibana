/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { GO_TO_DOCUMENTATION } from './translations';
import { EmptyPage } from '../../../../common/components/empty_page';
import { useKibana } from '../../../../common/lib/kibana';

const NO_INDEX_TITLE = i18n.translate('xpack.securitySolution.detectionEngine.noIndexTitle', {
  defaultMessage: 'Let’s set up your detection engine',
});
const NEEDS_INDEX_PERMISSIONS = (additionalContext: string) =>
  i18n.translate('xpack.securitySolution.alertsPage.needsIndexPermissionsMessage', {
    values: { additionalContext },
    defaultMessage:
      'To use the detection engine, a user with the required cluster and index privileges must first access this page. {additionalContext} For more help, contact your Elastic Stack administrator.',
  });
const NEEDS_SIGNALS_AND_LISTS_INDEXES = i18n.translate(
  'xpack.securitySolution.alertsPage.needsSignalsAndListsIndexesMessage',
  {
    defaultMessage: 'You need permissions for the signals and lists indices.',
  }
);
const NEEDS_SIGNALS_INDEX = i18n.translate(
  'xpack.securitySolution.alertsPage.needsSignalsIndexMessage',
  {
    defaultMessage: 'You need permissions for the signals index.',
  }
);
const NEEDS_LISTS_INDEXES = i18n.translate(
  'xpack.securitySolution.alertsPage.needsListsIndexesMessage',
  {
    defaultMessage: 'You need permissions for the lists indices.',
  }
);

export const NO_INDEX_TEST_ID = 'alerts-page-no-index';

const buildMessage = (needsListsIndex: boolean, needsSignalsIndex: boolean): string => {
  if (needsSignalsIndex && needsListsIndex) {
    return NEEDS_INDEX_PERMISSIONS(NEEDS_SIGNALS_AND_LISTS_INDEXES);
  } else if (needsSignalsIndex) {
    return NEEDS_INDEX_PERMISSIONS(NEEDS_SIGNALS_INDEX);
  } else if (needsListsIndex) {
    return NEEDS_INDEX_PERMISSIONS(NEEDS_LISTS_INDEXES);
  } else {
    return NEEDS_INDEX_PERMISSIONS('');
  }
};

export interface AlertsPageWrapperProps {
  /**
   * Whether the user needs permissions for lists indices.
   */
  needsListsIndex: boolean;
  /**
   * Whether the user needs permissions for the signals index.
   */
  needsSignalsIndex: boolean;
}

/**
 * EmptyPage component rendered on the alerts page when the user does not have the required
 * permissions to view the signals index or lists indices.
 * It provides a link to the documentation for detections requirements.
 */
export const NoIndexEmptyPage = memo(
  ({ needsListsIndex, needsSignalsIndex }: AlertsPageWrapperProps) => {
    const docLinks = useKibana().services.docLinks;
    const actions = useMemo(
      () => ({
        detections: {
          icon: 'documents',
          label: GO_TO_DOCUMENTATION,
          url: `${docLinks.links.siem.detectionsReq}`,
          target: '_blank',
        },
      }),
      [docLinks]
    );
    const message = buildMessage(needsListsIndex, needsSignalsIndex);

    return (
      <EmptyPage
        actions={actions}
        data-test-subj={NO_INDEX_TEST_ID}
        message={message}
        title={NO_INDEX_TITLE}
      />
    );
  }
);

NoIndexEmptyPage.displayName = 'NoIndexEmtpyPage';
