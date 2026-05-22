/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue, HOST_NAME_FIELD } from '@kbn/discover-utils';
import { useAppToasts } from '../../../../hooks/use_app_toasts';
import { useWithCaseDetailsRefresh } from '../..';
import { HostIsolationPanel } from './host_isolation_panel';
import { GET_ISOLATION_SUCCESS_MESSAGE, GET_UNISOLATION_SUCCESS_MESSAGE } from '../translations';
import { ISOLATE_HOST, UNISOLATE_HOST } from './translations';
import type { HostIsolationAction } from './use_host_isolation_action';
import { PREFIX } from '../../../../../flyout/shared/test_ids';

const HOST_ISOLATION_TEST_ID = `${PREFIX}HostIsolation` as const;
export const HOST_ISOLATION_FLYOUT_TEST_ID = `${HOST_ISOLATION_TEST_ID}Flyout` as const;
export const HOST_ISOLATION_TITLE_TEST_ID = `${HOST_ISOLATION_TEST_ID}Title` as const;
export const HOST_ISOLATION_PANEL_TEST_ID = `${HOST_ISOLATION_TEST_ID}Panel` as const;

export interface HostIsolationFlyoutProps {
  /**
   * Discover-shaped document. Used to extract alert id and host name.
   */
  hit: DataTableRecord;
  /**
   * Field-browser shaped data for the alert, fetched once by the parent so we can drive
   * the legacy isolation form without re-fetching.
   */
  detailsData: TimelineEventsDetailsItem[];
  /**
   * Whether the user is isolating or releasing the host.
   */
  isolateAction: HostIsolationAction;
  /**
   * Closes the surrounding flyout. Wired to the form's cancel button.
   */
  onClose: () => void;
}

/**
 * Host isolation form flyout. Renders a simple title header and the
 * isolate/release form. On success fires a toast notification and closes.
 * Used from the Flyout v2 Take Action menu in both the Security Solution
 * alerts flyout and Discover (via the OneDiscover bridge).
 */
export const HostIsolationFlyout: FC<HostIsolationFlyoutProps> = memo(
  ({ hit, detailsData, isolateAction, onClose }) => {
    const { addSuccess } = useAppToasts();
    const caseDetailsRefresh = useWithCaseDetailsRefresh();

    const title = isolateAction === 'isolateHost' ? ISOLATE_HOST : UNISOLATE_HOST;
    const hostName = getFieldValue(hit, HOST_NAME_FIELD) as string;

    const handleSuccess = useCallback(() => {
      addSuccess(
        isolateAction === 'isolateHost'
          ? GET_ISOLATION_SUCCESS_MESSAGE(hostName)
          : GET_UNISOLATION_SUCCESS_MESSAGE(hostName)
      );
      caseDetailsRefresh?.refreshCase();
      onClose();
    }, [addSuccess, caseDetailsRefresh, hostName, isolateAction, onClose]);

    return (
      <EuiFlyout
        onClose={onClose}
        // Explicit viewport mode keeps this nested flyout above the Timeline modal.
        container={null}
        session="never"
        size="m"
        paddingSize="m"
        aria-labelledby={HOST_ISOLATION_TITLE_TEST_ID}
        data-test-subj={HOST_ISOLATION_FLYOUT_TEST_ID}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={HOST_ISOLATION_TITLE_TEST_ID} data-test-subj={HOST_ISOLATION_TITLE_TEST_ID}>
              {title}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <div data-test-subj={HOST_ISOLATION_PANEL_TEST_ID}>
            <HostIsolationPanel
              details={detailsData}
              cancelCallback={onClose}
              successCallback={handleSuccess}
              isolateAction={isolateAction}
            />
          </div>
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
);

HostIsolationFlyout.displayName = 'HostIsolationFlyout';
