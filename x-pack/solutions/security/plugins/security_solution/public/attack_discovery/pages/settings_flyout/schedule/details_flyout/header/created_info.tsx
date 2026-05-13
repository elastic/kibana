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
  createdBy?: string;
  createdAt?: string;
  'data-test-subj'?: string;
}

/**
 * Created by and created at text that are shown on schedule details flyout
 */
export const CreatedBy: React.FC<Props> = React.memo(
  ({ createdBy, createdAt, 'data-test-subj': dataTestSubj }) => {
    return (
      <div data-test-subj={dataTestSubj}>
        <FormattedMessage
          id="xpack.securitySolution.attackDiscovery.schedule.detailsFlyout.header.scheduleCreationDescription"
          defaultMessage="{created_by}: {by} on {date}"
          values={{
            created_by: <strong>{i18n.CREATED_BY}</strong>,
            by: createdBy ?? i18n.UNKNOWN_TEXT,
            date: (
              <FormattedDate value={createdAt ?? new Date().toISOString()} fieldName="createdAt" />
            ),
          }}
        />
      </div>
    );
  }
);
CreatedBy.displayName = 'CreatedBy';
