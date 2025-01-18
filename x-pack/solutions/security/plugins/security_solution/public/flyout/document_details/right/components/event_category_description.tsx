/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, EuiTitle, EuiSpacer, EuiText } from '@elastic/eui';
import { startCase } from 'lodash';
import { useDocumentDetailsContext } from '../../shared/context';
import { getEcsAllowedValueDescription } from '../utils/event_utils';
import { getFieldArray } from '../../shared/utils';
import { EVENT_CATEGORY_DESCRIPTION_TEST_ID } from './test_ids';

/**
 * Displays the category description of an event document.
 */
export const EventCategoryDescription: React.FC = () => {
  const { getFieldsData } = useDocumentDetailsContext();
  const eventCategories = useMemo(
    () => getFieldArray(getFieldsData('event.category')),
    [getFieldsData]
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
          <EuiText size="s">{getEcsAllowedValueDescription('event.category', category)}</EuiText>
        </EuiFlexItem>
      ))}
    </>
  );
};

EventCategoryDescription.displayName = 'EventCategoryDescription';
