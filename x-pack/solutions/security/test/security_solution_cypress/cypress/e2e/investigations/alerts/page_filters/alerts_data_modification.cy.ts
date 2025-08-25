/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../../objects/rule';
import { createRule } from '../../../../tasks/api_calls/rules';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';
import { ALERTS_URL } from '../../../../urls/navigation';
import {
  markAcknowledgedFirstAlert,
  selectPageFilterValue,
  waitForAlerts,
} from '../../../../tasks/alerts';
import { ALERTS_COUNT } from '../../../../screens/alerts';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

describe(
  `Alerts page filters - alerts data modification`,
  { tags: ['@ess', '@serverless'] },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      createRule(getNewRule());
      login();
      visitWithTimeRange(ALERTS_URL);
      waitForAlerts();
    });

    /*
     *
     * default scrollBehavior is true, which scrolls the element into view automatically without any scroll Margin
     * if an element has some hover actions above the element, they get hidden on top of the window.
     * So, we need to set scrollBehavior to false to avoid scrolling the element into view and we can scroll ourselves
     * when needed.
     *
     * Ref : https://docs.cypress.io/guides/core-concepts/interacting-with-elements#Scrolling
     */
    it(
      `should update alert status list when the alerts are updated`,
      {
        scrollBehavior: false,
      },
      () => {
        // mark status of one alert to be acknowledged
        cy.get(ALERTS_COUNT)
          .invoke('text')
          .then(() => {
            markAcknowledgedFirstAlert();
            waitForAlerts();
            selectPageFilterValue(0, 'acknowledged');
            cy.get(ALERTS_COUNT)
              .invoke('text')
              .should((newAlertCount) => {
                expect(newAlertCount.split(' ')[0]).eq('1');
              });
          });
      }
    );
  }
);
