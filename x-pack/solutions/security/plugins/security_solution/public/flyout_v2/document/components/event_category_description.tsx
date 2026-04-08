/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { startCase } from 'lodash';
import type { DataTableRecord } from '@kbn/discover-utils';
import { EVENT_CATEGORY_FIELD } from '@kbn/discover-utils';
import { getEventCategoriesFromData } from '../utils/get_event_categories';
import { getEcsAllowedValueDescription } from '../utils/event_utils';
import { EVENT_CATEGORY_DESCRIPTION_TEST_ID } from './test_ids';

export interface EventCategoryDescriptionProps {
  /**
   * Document record to render event category descriptions for
   */
  hit: DataTableRecord;
}

/**
 * Displays the category description of an event document.
 */
export const EventCategoryDescription: React.FC<EventCategoryDescriptionProps> = ({ hit }) => {
  const eventCategories = useMemo(
    () => getEventCategoriesFromData(hit).allEventCategories ?? [],
    [hit]
  );

  return (
    <>
      {eventCategories.map((category) => (
        <EuiFlexItem
          data-test-subj={`${EVENT_CATEGORY_DESCRIPTION_TEST_ID}-${category}`}
          key={`event-category-${category}`}
        >
          <EuiTitle size="xxs">
            <h5>{startCase(category)}</h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            {getEcsAllowedValueDescription(EVENT_CATEGORY_FIELD, category)}
          </EuiText>
        </EuiFlexItem>
      ))}
    </>
  );
};

EventCategoryDescription.displayName = 'EventCategoryDescription';
