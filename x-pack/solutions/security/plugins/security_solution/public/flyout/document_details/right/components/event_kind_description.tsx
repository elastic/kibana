/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer, EuiText, EuiToolTip } from '@elastic/eui';
import { startCase } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDocumentDetailsContext } from '../../shared/context';
import { getEcsAllowedValueDescription } from '../utils/event_utils';
import { getFieldArray } from '../../shared/utils';
import {
  EVENT_KIND_DESCRIPTION_TEST_ID,
  EVENT_KIND_DESCRIPTION_TEXT_TEST_ID,
  EVENT_KIND_DESCRIPTION_CATEGORIES_TEST_ID,
} from './test_ids';

export interface EventKindDescriptionProps {
  /**
   * Event kind field from ecs
   */
  eventKind: string;
}

/**
 * Display description of a document at the event kind level
 * Shows the ecs description of the event kind, and a list of event categories
 */
export const EventKindDescription: React.FC<EventKindDescriptionProps> = ({ eventKind }) => {
  const { getFieldsData } = useDocumentDetailsContext();
  const eventCategories = useMemo(
    () => getFieldArray(getFieldsData('event.category')),
    [getFieldsData]
  );

  return (
    <EuiFlexItem data-test-subj={EVENT_KIND_DESCRIPTION_TEST_ID}>
      <EuiTitle size="xxs" data-test-subj={EVENT_KIND_DESCRIPTION_TEXT_TEST_ID}>
        <h5>{startCase(eventKind)}</h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">{getEcsAllowedValueDescription('event.kind', eventKind)}</EuiText>
      {eventCategories.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                defaultMessage="Event category"
                id="xpack.securitySolution.flyout.right.eventCategoryText"
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
                <EuiToolTip content={getEcsAllowedValueDescription('event.category', category)}>
                  <EuiText size="s">
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
