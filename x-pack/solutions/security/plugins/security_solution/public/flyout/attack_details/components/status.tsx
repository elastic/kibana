/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { find } from 'lodash/fp';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { SIGNAL_STATUS_FIELD_NAME } from '../../../timelines/components/timeline/body/renderers/constants';
import { getEnrichedFieldInfo } from '../../document_details/right/utils/enriched_field_info';

import { AlertHeaderBlock } from '../../shared/components/alert_header_block';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import type {
  EnrichedFieldInfo,
  EnrichedFieldInfoWithValues,
} from '../../document_details/right/utils/enriched_field_info';
import { StatusPopoverButton } from './status_popover_button';
import { useAttackDetailsContext } from '../context';
import { HEADER_STATUS_BLOCK_TEST_ID } from '../constants/test_ids';

/**
 * Checks if the field info has data to convert EnrichedFieldInfo into EnrichedFieldInfoWithValues
 */
function hasData(fieldInfo?: EnrichedFieldInfo): fieldInfo is EnrichedFieldInfoWithValues {
  return !!fieldInfo && Array.isArray(fieldInfo.values);
}

export const Status = memo(() => {
  const { attackId, browserFields, dataFormattedForFieldBrowser } = useAttackDetailsContext();
  const currentSpaceId = useSpaceId();
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
    <AlertHeaderBlock
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
        <StatusPopoverButton enrichedFieldInfo={statusData} />
      )}
    </AlertHeaderBlock>
  );
});

Status.displayName = 'Status';
