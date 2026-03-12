/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import type { FC } from 'react';
import React, { useMemo } from 'react';
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

/**
 * Displays the information provided by the rowRenderer. Supports multiple types of documents.
 */
export interface AlertReasonProps {
  /**
   * Alert/event document
   */
  hit: DataTableRecord;
  /**
   * Callback to show the full reason panel when clicking "Show full reason".
   * If not provided, no button is rendered.
   */
  onShowFullReason?: () => void;
}

export const AlertReason: FC<AlertReasonProps> = ({ hit, onShowFullReason }) => {
  const isAlert = useMemo(() => (getFieldValue(hit, EVENT_KIND) as string) === 'signal', [hit]);
  const reason = useMemo(() => getFieldValue(hit, 'kibana.alert.reason') as string, [hit]);

  const viewPreview = useMemo(
    () =>
      onShowFullReason ? (
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
            disabled={!reason}
          >
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.about.reason.alertReasonButtonLabel"
              defaultMessage="Show full reason"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null,
    [onShowFullReason, reason]
  );

  const alertReasonText = reason ? (
    reason
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

AlertReason.displayName = 'AlertReason';
