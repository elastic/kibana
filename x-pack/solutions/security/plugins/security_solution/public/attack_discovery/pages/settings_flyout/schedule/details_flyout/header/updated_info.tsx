/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import * as i18n from './translations';
import { FormattedDate } from '../../../../../../common/components/formatted_date';

interface Props {
  updatedBy?: string;
  updatedAt?: string;
  'data-test-subj'?: string;
}

/**
 * Updated by and updated at text that are shown on schedule details flyout
 */
export const UpdatedBy: React.FC<Props> = React.memo(
  ({ updatedBy, updatedAt, 'data-test-subj': dataTestSubj }) => {
    return (
      <div data-test-subj={dataTestSubj}>
        <FormattedMessage
          id="xpack.securitySolution.attackDiscovery.schedule.detailsFlyout.header.scheduleUpdateDescription"
          defaultMessage="{updated_by}: {by} on {date}"
          values={{
            updated_by: <strong>{i18n.UPDATED_BY}</strong>,
            by: updatedBy ?? i18n.UNKNOWN_TEXT,
            date: (
              <FormattedDate value={updatedAt ?? new Date().toISOString()} fieldName="updatedAt" />
            ),
          }}
        />
      </div>
    );
  }
);
UpdatedBy.displayName = 'UpdatedBy';
