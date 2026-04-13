/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle, EuiToolTip } from '@elastic/eui';
import { startCase } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { EVENT_CATEGORY_FIELD, getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { getEventCategoriesFromData } from '../utils/get_event_categories';
import { getEcsAllowedValueDescription } from '../utils/event_utils';
import {
  EVENT_KIND_DESCRIPTION_CATEGORIES_TEST_ID,
  EVENT_KIND_DESCRIPTION_TEST_ID,
  EVENT_KIND_DESCRIPTION_TEXT_TEST_ID,
} from './test_ids';

export interface EventKindDescriptionProps {
  /**
   * Document record to render event kind description for
   */
  hit: DataTableRecord;
}

/**
 * Display description of a document at the event kind level.
 * Shows the ecs description of the event kind, and a list of event categories.
 */
export const EventKindDescription: React.FC<EventKindDescriptionProps> = ({ hit }) => {
  const eventKind = useMemo(() => getFieldValue(hit, EVENT_KIND) as string, [hit]);
  const eventCategories = useMemo(
    () => getEventCategoriesFromData(hit).allEventCategories ?? [],
    [hit]
  );

  return (
    <EuiFlexItem data-test-subj={EVENT_KIND_DESCRIPTION_TEST_ID}>
      <EuiTitle size="xxs" data-test-subj={EVENT_KIND_DESCRIPTION_TEXT_TEST_ID}>
        <h5>{startCase(eventKind)}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">{getEcsAllowedValueDescription(EVENT_KIND, eventKind)}</EuiText>
      {eventCategories.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                defaultMessage="Event category"
                id="xpack.securitySolution.flyout.document.about.eventCategoryText"
              />
            </h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            responsive={false}
            gutterSize="s"
            data-test-subj={EVENT_KIND_DESCRIPTION_CATEGORIES_TEST_ID}
          >
            {eventCategories.map((category, idx) => (
              <EuiFlexItem grow={false} key={`event-category-${category}`}>
                <EuiToolTip content={getEcsAllowedValueDescription(EVENT_CATEGORY_FIELD, category)}>
                  <EuiText size="s" tabIndex={0}>
                    {category}
                    {idx !== eventCategories.length - 1 && ','}
                  </EuiText>
                </EuiToolTip>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </EuiFlexItem>
  );
};

EventKindDescription.displayName = 'EventKindDescription';
