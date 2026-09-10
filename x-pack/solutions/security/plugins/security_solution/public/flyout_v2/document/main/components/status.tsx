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
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeStatusBadges } from '@kbn/alerting-v2-episodes-ui/components/status/status_badges';
import { FlyoutHeaderBlock } from '../../../shared/components/flyout_header_block';
import {
  type CellActionRenderer,
  noopCellActionRenderer,
} from '../../../shared/components/cell_actions';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { StatusPopoverButton, type StatusPopoverButtonFieldInfo } from './status_popover_button';
import { STATUS_TITLE_TEST_ID } from './test_ids';
import { isRulePreviewDocument } from '../../../shared/utils/is_rule_preview_document';

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
    const isPreview = useMemo(() => isRulePreviewDocument(hit), [hit]);
    // v2 episodes carry a system-derived `episode.status` (active/pending/recovering/inactive). The
    // v1 status popover mutates via the detection-alert API keyed by `_id`, which doesn't apply to
    // an episode, so we render the RnA status badge read-only (episode status changes live in the
    // table's row actions for now).
    const isEpisode = useMemo(() => getFieldValue(hit, 'episode.id') != null, [hit]);
    const episodeStatus = useMemo(
      () => getFieldValue(hit, 'episode.status') as AlertEpisodeStatus | undefined,
      [hit]
    );
    const eventId = hit.raw._id as string;
    const isRemoteDocument = useMemo(
      () => isNonLocalIndexName(hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? ''),
      [hit]
    );
    const statusFieldInfo = useMemo<StatusPopoverButtonFieldInfo | null>(() => {
      if (isPreview) return null;

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
    }, [isPreview, eventId, hit]);

    return (
      <FlyoutHeaderBlock
        hasBorder
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.document.header.statusTitle"
            defaultMessage="Status"
          />
        }
        data-test-subj={STATUS_TITLE_TEST_ID}
      >
        {isEpisode ? (
          episodeStatus ? (
            <AlertEpisodeStatusBadges status={episodeStatus} />
          ) : (
            getEmptyTagValue()
          )
        ) : !statusFieldInfo ? (
          getEmptyTagValue()
        ) : (
          renderCellActions({
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
            })
        )}
      </FlyoutHeaderBlock>
    );
  }
);

Status.displayName = 'Status';
