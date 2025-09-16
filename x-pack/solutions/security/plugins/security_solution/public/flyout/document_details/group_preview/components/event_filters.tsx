/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const allFilters = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.groupPreview.eventFilters.allEvents',
  { defaultMessage: 'All events' }
);

const alerts = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.groupPreview.eventFilters.alerts',
  { defaultMessage: 'Alerts' }
);

const failed = i18n.translate(
  'xpack.securitySolution.flyout.documentDetails.groupPreview.eventFilters.failed',
  { defaultMessage: 'Failed' }
);

const ALL_EVENTS = 'all-events';
const ALERTS = 'alerts';
const FAILED = 'failed';

type Filter = typeof ALL_EVENTS | typeof ALERTS | typeof FAILED;

export interface EventFiltersProps {
  onChange: (filter: Filter) => void;
}

export const EventFilters = ({ onChange }: EventFiltersProps) => {
  const [activeEventsFilter, toggleEventsFilter] = useState<Filter>(ALL_EVENTS);
  return (
    <EuiFilterGroup>
      <EuiFilterButton
        css={css`
          text-transform: capitalize;
        `}
        isToggle
        withNext
        hasActiveFilters={activeEventsFilter === ALL_EVENTS}
        isSelected={activeEventsFilter === ALL_EVENTS}
        onClick={() => {
          toggleEventsFilter(ALL_EVENTS);
          onChange(ALL_EVENTS);
        }}
      >
        {allFilters}
      </EuiFilterButton>
      <EuiFilterButton
        isToggle
        withNext
        hasActiveFilters={activeEventsFilter === ALERTS}
        isSelected={activeEventsFilter === ALERTS}
        onClick={() => {
          toggleEventsFilter(ALERTS);
          onChange(ALERTS);
        }}
      >
        {alerts}
      </EuiFilterButton>
      <EuiFilterButton
        isToggle
        withNext
        hasActiveFilters={activeEventsFilter === FAILED}
        isSelected={activeEventsFilter === FAILED}
        onClick={() => {
          toggleEventsFilter(FAILED);
          onChange(FAILED);
        }}
      >
        {failed}
      </EuiFilterButton>
    </EuiFilterGroup>
  );
};
