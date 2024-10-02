/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import { deleteAlertsAndRules } from '../../../tasks/api_calls/common';
import { createRule } from '../../../tasks/api_calls/rules';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';
import { openTimelineUsingToggle } from '../../../tasks/security_main';
import { ALERTS_URL } from '../../../urls/navigation';
import {
  createNewTimeline,
  executeTimelineKQL,
  executeTimelineSearch,
  openTimelineEventContextMenu,
} from '../../../tasks/timeline';
import { MARK_ALERT_ACKNOWLEDGED_BTN } from '../../../screens/alerts';
import { GET_TIMELINE_GRID_CELL } from '../../../screens/timeline';

describe(
  'Timeline table Row Actions',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'unifiedComponentsInTimelineDisabled',
          ])}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      createRule(getNewRule());
      login();
      visitWithTimeRange(ALERTS_URL);
      openTimelineUsingToggle();
      createNewTimeline();
      executeTimelineSearch('*');
    });

    it('should refresh the table when alert status is changed', () => {
      executeTimelineKQL('kibana.alert.workflow_status:open');
      cy.get(GET_TIMELINE_GRID_CELL('@timestamp')).should('have.length', 1);
      openTimelineEventContextMenu();
      cy.get(MARK_ALERT_ACKNOWLEDGED_BTN).click();
      cy.get(GET_TIMELINE_GRID_CELL('@timestamp')).should('have.length', 0);
    });
  }
);
