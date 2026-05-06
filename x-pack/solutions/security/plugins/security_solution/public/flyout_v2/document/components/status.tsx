/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { isNonLocalIndexName } from '@kbn/es-query';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertHeaderBlock } from '../../shared/components/alert_header_block';
import {
  type CellActionRenderer,
  noopCellActionRenderer,
} from '../../shared/components/cell_actions';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { StatusPopoverButton, type StatusPopoverButtonFieldInfo } from './status_popover_button';
import { STATUS_TITLE_TEST_ID } from './test_ids';

const WORKFLOW_STATUS_FIELD_DATA = {
  field: ALERT_WORKFLOW_STATUS,
  format: 'string',
  type: 'string',
  isObjectArray: false,
} as const;

interface StatusProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
  /**
   * Optional cell action renderer for the status value
   */
  renderCellActions?: CellActionRenderer;
  /**
   * Optional callback invoked after the alert status is updated
   */
  onAlertUpdated?: () => void;
}

/**
 * Renders the alert status control in the document flyout header.
 * Supports inline status updates and optional cell actions for the status value.
 */
export const Status = memo(
  ({ hit, renderCellActions = noopCellActionRenderer, onAlertUpdated }: StatusProps) => {
    const eventId = hit.raw._id as string;
    const isRemoteDocument = useMemo(
      () => isNonLocalIndexName(hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? ''),
      [hit]
    );
    const statusFieldInfo = useMemo<StatusPopoverButtonFieldInfo | null>(() => {
      const workflowStatus = getFieldValue(hit, ALERT_WORKFLOW_STATUS);
      const statusValue = Array.isArray(workflowStatus)
        ? (workflowStatus[0] as string)
        : (workflowStatus as string);

      if (!eventId || !statusValue) {
        return null;
      }

      return {
        data: WORKFLOW_STATUS_FIELD_DATA,
        values: [statusValue],
      };
    }, [eventId, hit]);

    return (
      <AlertHeaderBlock
        hasBorder
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.document.header.statusTitle"
            defaultMessage="Status"
          />
        }
        data-test-subj={STATUS_TITLE_TEST_ID}
      >
        {!statusFieldInfo
          ? getEmptyTagValue()
          : renderCellActions({
              field: ALERT_WORKFLOW_STATUS,
              value: statusFieldInfo.values[0],
              scopeId: '',
              children: (
                <StatusPopoverButton
                  eventId={eventId}
                  contextId=""
                  enrichedFieldInfo={statusFieldInfo}
                  scopeId=""
                  onStatusUpdated={onAlertUpdated}
                  disabled={isRemoteDocument}
                />
              ),
            })}
      </AlertHeaderBlock>
    );
  }
);

Status.displayName = 'Status';
