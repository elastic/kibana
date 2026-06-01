/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { find } from 'lodash/fp';
import { isNonLocalIndexName } from '@kbn/es-query';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { SIGNAL_STATUS_FIELD_NAME } from '../../../../timelines/components/timeline/body/renderers/constants';
import { getEnrichedFieldInfo } from '../../../../flyout/document_details/right/utils/enriched_field_info';

import { FlyoutHeaderBlock } from '../../../shared/components/flyout_header_block';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import type {
  EnrichedFieldInfo,
  EnrichedFieldInfoWithValues,
} from '../../../../flyout/document_details/right/utils/enriched_field_info';
import { StatusPopoverButton } from './status_popover_button';
import { HEADER_STATUS_BLOCK_TEST_ID } from '../constants/test_ids';

/**
 * Checks if the field info has data to convert EnrichedFieldInfo into EnrichedFieldInfoWithValues
 */
function hasData(fieldInfo?: EnrichedFieldInfo): fieldInfo is EnrichedFieldInfoWithValues {
  return !!fieldInfo && Array.isArray(fieldInfo.values);
}

export interface StatusProps {
  /**
   * Parsed attack-discovery alert resolved by {@link useAttackDetails}.
   * Provides `attackId` (`attack.id`) and `indexName` (`attack.index`) for
   * the workflow-status popover.
   */
  attack: AttackDiscoveryAlert;
  /**
   * Browser fields used to enrich the workflow-status field.
   */
  browserFields: BrowserFields;
  /**
   * Field-browser representation of the attack document; the workflow-status
   * row is looked up here.
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
}

export const Status = memo(
  ({ attack, browserFields, dataFormattedForFieldBrowser }: StatusProps) => {
    const attackId = attack.id;
    const indexName = attack.index ?? '';
    const currentSpaceId = useSpaceId();
    const isRemoteDocument = isNonLocalIndexName(indexName);
    const statusData = useMemo(() => {
      const item = find(
        { field: SIGNAL_STATUS_FIELD_NAME, category: 'kibana' },
        dataFormattedForFieldBrowser
      );
      return (
        item &&
        getEnrichedFieldInfo({
          eventId: attackId,
          contextId: `${currentSpaceId}-attack-details-flyout-status`,
          scopeId: currentSpaceId || '',
          browserFields,
          item,
        })
      );
    }, [dataFormattedForFieldBrowser, attackId, currentSpaceId, browserFields]);

    return (
      <FlyoutHeaderBlock
        hasBorder
        title={
          <FormattedMessage
            id="xpack.securitySolution.attackDetailsFlyout.header.statusTitle"
            defaultMessage="Status"
          />
        }
        data-test-subj={HEADER_STATUS_BLOCK_TEST_ID}
      >
        {!statusData || !hasData(statusData) ? (
          getEmptyTagValue()
        ) : (
          <StatusPopoverButton
            attack={attack}
            enrichedFieldInfo={statusData}
            disabled={isRemoteDocument}
          />
        )}
      </FlyoutHeaderBlock>
    );
  }
);

Status.displayName = 'Status';
