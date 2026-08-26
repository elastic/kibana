/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import {
  CONTROL_FRAMES,
  OPTION_LIST_LABELS,
  OPTION_LIST_VALUES,
} from '../screens/common/filter_group';

const DEFAULT_DETECTION_PAGE_FILTERS: FilterControlConfig[] = [
  {
    title: 'Status',
    field_name: 'kibana.alert.workflow_status',
    selected_options: ['open'],
    display_settings: {
      hide_action_bar: true,
      hide_exists: true,
    },
    persist: true,
  },
  {
    title: 'Severity',
    field_name: 'kibana.alert.severity',
    selected_options: [],
    display_settings: {
      hide_action_bar: true,
      hide_exists: true,
    },
  },
  {
    title: 'User',
    field_name: 'user.name',
  },
  {
    title: 'Host',
    field_name: 'host.name',
  },
];

export const assertFilterControlsWithFilterObject = (
  filterObject: FilterControlConfig[] = DEFAULT_DETECTION_PAGE_FILTERS
) => {
  cy.get(CONTROL_FRAMES).should((sub) => {
    expect(sub.length).eq(filterObject.length);
  });

  cy.get(OPTION_LIST_LABELS).should((sub) => {
    filterObject.forEach((filter, idx) => {
      expect(sub.eq(idx).text()).eq(filter.title);
    });
  });

  filterObject.forEach((filter, idx) => {
    cy.get(OPTION_LIST_VALUES(idx)).should((sub) => {
      const controlText = sub.text();
      filter.selected_options?.forEach((option) => {
        expect(controlText).to.have.string(String(option));
      });
    });
  });
};
