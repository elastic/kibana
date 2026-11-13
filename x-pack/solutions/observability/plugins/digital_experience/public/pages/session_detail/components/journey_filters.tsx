/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../../ebt_constants';
import { ACTIVITY_KINDS, type ActivityFilters, type ActivityKind } from '../utils/visit_activity';

const KIND_LABELS: Record<ActivityKind, string> = {
  request: i18n.translate('xpack.digitalExperience.sessionDetail.filters.requests', {
    defaultMessage: 'Requests',
  }),
  click: i18n.translate('xpack.digitalExperience.sessionDetail.filters.clicks', {
    defaultMessage: 'Clicks',
  }),
  error: i18n.translate('xpack.digitalExperience.sessionDetail.filters.errors', {
    defaultMessage: 'Errors',
  }),
  web_vital: i18n.translate('xpack.digitalExperience.sessionDetail.filters.webVitals', {
    defaultMessage: 'Web vitals',
  }),
};

/** Which kinds of activity the page journey shows, and a search across them. */
export function JourneyFilters({
  filters,
  counts,
  onChange,
}: {
  filters: ActivityFilters;
  /** How many of each kind the session has. */
  counts: Record<ActivityKind, number>;
  onChange: (filters: ActivityFilters) => void;
}) {
  const toggle = (kind: ActivityKind) => {
    const kinds = new Set(filters.kinds);
    if (kinds.has(kind)) {
      kinds.delete(kind);
    } else {
      kinds.add(kind);
    }
    onChange({ ...filters, kinds });
  };

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup
          aria-label={i18n.translate('xpack.digitalExperience.sessionDetail.filters.kindsLabel', {
            defaultMessage: 'Kinds of activity to show',
          })}
        >
          {ACTIVITY_KINDS.map((kind) => (
            <EuiFilterButton
              key={kind}
              isToggle
              isSelected={filters.kinds.has(kind)}
              hasActiveFilters={filters.kinds.has(kind)}
              numFilters={counts[kind]}
              onClick={() => toggle(kind)}
              data-test-subj={`digitalExperienceActivityFilter-${kind}`}
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
                element: SESSIONS_EBT_ELEMENTS.ACTIVITY_KIND_FILTER,
              })}
            >
              {KIND_LABELS[kind]}
            </EuiFilterButton>
          ))}
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem css={{ minWidth: 200 }}>
        <EuiFieldSearch
          compressed
          fullWidth
          incremental
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder={i18n.translate(
            'xpack.digitalExperience.sessionDetail.filters.searchPlaceholder',
            { defaultMessage: '/api/cart, button.buy or TypeError' }
          )}
          aria-label={i18n.translate('xpack.digitalExperience.sessionDetail.filters.searchLabel', {
            defaultMessage: 'Search URLs, selectors and error messages',
          })}
          data-test-subj="digitalExperienceActivitySearch"
          {...getEbtProps({
            action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SET_FILTER,
            element: SESSIONS_EBT_ELEMENTS.ACTIVITY_SEARCH,
          })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
