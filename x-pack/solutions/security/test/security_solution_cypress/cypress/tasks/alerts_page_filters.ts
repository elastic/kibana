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
    fieldName: 'kibana.alert.workflow_status',
    selectedOptions: ['open'],
    displaySettings: {
      hideActionBar: true,
      hideExists: true,
    },
    persist: true,
  },
  {
    title: 'Severity',
    fieldName: 'kibana.alert.severity',
    selectedOptions: [],
    displaySettings: {
      hideActionBar: true,
      hideExists: true,
    },
  },
  {
    title: 'User',
    fieldName: 'user.name',
  },
  {
    title: 'Host',
    fieldName: 'host.name',
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
      filter.selectedOptions?.forEach((option) => {
        expect(controlText).to.have.string(String(option));
      });
    });
  });
};
