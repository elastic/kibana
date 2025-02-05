/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana';
import { getField } from '../../shared/utils';
import { DocumentDetailsAlertReasonPanelKey } from '../../shared/constants/panel_keys';
import {
  REASON_DETAILS_PREVIEW_BUTTON_TEST_ID,
  REASON_DETAILS_TEST_ID,
  REASON_TITLE_TEST_ID,
} from './test_ids';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import { useDocumentDetailsContext } from '../../shared/context';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';

export const ALERT_REASON_BANNER = {
  title: i18n.translate(
    'xpack.securitySolution.flyout.right.about.reason.alertReasonPreviewTitle',
    {
      defaultMessage: 'Preview alert reason',
    }
  ),
  backgroundColor: 'warning',
  textColor: 'warning',
};

/**
 * Displays the information provided by the rowRenderer. Supports multiple types of documents.
 */
export const Reason: FC = () => {
  const { telemetry } = useKibana().services;
  const { eventId, indexName, scopeId, dataFormattedForFieldBrowser, getFieldsData } =
    useDocumentDetailsContext();
  const { isAlert } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const alertReason = getField(getFieldsData(ALERT_REASON));

  const { openPreviewPanel } = useExpandableFlyoutApi();
  const openRulePreview = useCallback(() => {
    openPreviewPanel({
      id: DocumentDetailsAlertReasonPanelKey,
      params: {
        id: eventId,
        indexName,
        scopeId,
        banner: ALERT_REASON_BANNER,
      },
    });
    telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
      location: scopeId,
      panel: 'preview',
    });
  }, [eventId, openPreviewPanel, indexName, scopeId, telemetry]);

  const viewPreview = useMemo(
    () => (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="expand"
          onClick={openRulePreview}
          iconSide="right"
          data-test-subj={REASON_DETAILS_PREVIEW_BUTTON_TEST_ID}
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.about.reason.alertReasonButtonAriaLabel',
            {
              defaultMessage: 'Show full reason',
            }
          )}
          disabled={!alertReason}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.about.reason.alertReasonButtonLabel"
            defaultMessage="Show full reason"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    ),
    [alertReason, openRulePreview]
  );

  const alertReasonText = alertReason ? (
    alertReason
  ) : (
    <FormattedMessage
      id="xpack.securitySolution.flyout.right.about.reason.noReasonDescription"
      defaultMessage="There's no source event information for this alert."
    />
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem data-test-subj={REASON_TITLE_TEST_ID}>
        <EuiTitle size="xxs">
          <h5>
            {isAlert ? (
              <EuiFlexGroup
                justifyContent="spaceBetween"
                alignItems="center"
                gutterSize="none"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <h5>
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.right.about.reason.alertReasonTitle"
                      defaultMessage="Alert reason"
                    />
                  </h5>
                </EuiFlexItem>
                {viewPreview}
              </EuiFlexGroup>
            ) : (
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.about.reason.documentReasonTitle"
                  defaultMessage="Document reason"
                />
              </p>
            )}
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={REASON_DETAILS_TEST_ID}>
        {isAlert ? alertReasonText : '-'}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

Reason.displayName = 'Reason';
