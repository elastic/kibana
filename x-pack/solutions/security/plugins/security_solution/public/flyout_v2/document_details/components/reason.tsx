/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  REASON_DETAILS_PREVIEW_BUTTON_TEST_ID,
  REASON_DETAILS_TEST_ID,
  REASON_TITLE_TEST_ID,
} from './test_ids';

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

export interface ReasonProps {
  /**
   * Alert/event document
   */
  hit: DataTableRecord;
  /**
   * Callback to show the full reason preview panel when the "Show full reason" button is clicked.
   * If not provided, the button won't be rendered.
   */
  onShowFullReason?: () => void;
  /**
   * Optional override to disable the full reason preview button.
   */
  fullReasonDisabled?: boolean;
}

/**
 * Displays the alert reason. Supports multiple types of documents.
 */
export const Reason: FC<ReasonProps> = ({ hit, onShowFullReason, fullReasonDisabled }) => {
  const isAlert = useMemo(
    () => Boolean(getFieldValue(hit, 'kibana.alert.rule.uuid') as string),
    [hit]
  );
  const alertReason = useMemo(() => getFieldValue(hit, ALERT_REASON) as string, [hit]);
  const isShowFullReasonButtonDisabled = fullReasonDisabled ?? !alertReason;

  const viewPreview = useMemo(
    () => (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="expand"
          onClick={onShowFullReason}
          iconSide="right"
          data-test-subj={REASON_DETAILS_PREVIEW_BUTTON_TEST_ID}
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.about.reason.alertReasonButtonAriaLabel',
            {
              defaultMessage: 'Show full reason',
            }
          )}
          disabled={isShowFullReasonButtonDisabled}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.about.reason.alertReasonButtonLabel"
            defaultMessage="Show full reason"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    ),
    [onShowFullReason, isShowFullReasonButtonDisabled]
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
                {onShowFullReason && viewPreview}
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
