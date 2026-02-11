/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCustomQueryRuleParams } from '../../../../objects/rule';
import {
  CLOSE_ALERT_BTN,
  MARK_ALERT_ACKNOWLEDGED_BTN,
  ALERT_ASSIGN_CONTEXT_MENU_ITEM,
  ALERT_TAGGING_CONTEXT_MENU_ITEM,
  TAKE_ACTION_POPOVER_BTN,
  CLOSE_SELECTED_ALERTS_BTN,
} from '../../../../screens/alerts';
import {
  addAlertTagToNAlerts,
  closeAlerts,
  expandFirstAlertActions,
  markAcknowledgedFirstAlert,
  openFirstAlert,
  selectNumberOfAlerts,
  goToClosedAlerts,
  goToAcknowledgedAlerts,
  waitForAlerts,
} from '../../../../tasks/alerts';
import { createRule } from '../../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { loginWithUser } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { ALERTS_URL } from '../../../../urls/navigation';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../../tasks/privileges';
import { assertSuccessToast } from '../../../../screens/common/toast';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import {
  removeAllAssigneesForFirstAlert,
  updateAssigneesForFirstAlert,
} from '../../../../tasks/alert_assignments';
import { sortUsingDataGridBtn } from '../../../../tasks/table_pagination';

// ====================================
// Role Definitions
// ====================================

// Legacy Rules V1 Read Role - has deprecated alert update privileges
const legacyRulesV1Read = {
  name: 'legacy_rules_v1_read_role',
  privileges: {
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['all'] }],
    },
    kibana: [
      {
        feature: {
          securitySolutionRulesV1: ['read'],
          savedObjectManagement: ['all'],
          indexPatterns: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

// Legacy Security V1 Read Role - has deprecated alert update privileges
const legacySecurityV1Read = {
  name: 'legacy_security_v1_read_role',
  privileges: {
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['all'] }],
    },
    kibana: [
      {
        feature: {
          siemV1: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

// Legacy Security V2 Read Role - has deprecated alert update privileges
const legacySecurityV2Read = {
  name: 'legacy_security_v2_read_role',
  privileges: {
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['all'] }],
    },
    kibana: [
      {
        feature: {
          siemV2: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

// Legacy Rules V2 Read Role - has deprecated alert update privileges
const legacyRulesV2Read = {
  name: 'legacy_rules_v2_read_role',
  privileges: {
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['all'] }],
    },
    kibana: [
      {
        feature: {
          securitySolutionRulesV2: ['read'],
          savedObjectManagement: ['all'],
          indexPatterns: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

// Alerts V1 Read Only Role - does NOT have deprecated alert update privileges
const alertsV1ReadOnly = {
  name: 'alerts_v1_read_only_role',
  privileges: {
    elasticsearch: {
      indices: [{ names: ['*'], privileges: ['all'] }],
    },
    kibana: [
      {
        feature: {
          securitySolutionAlertsV1: ['read'],
          indexPatterns: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

// User definitions
const legacyRulesV1ReadUser = {
  username: 'legacy_rules_v1_read_user',
  password: 'password',
  roles: [legacyRulesV1Read.name],
};

const legacySecurityV1ReadUser = {
  username: 'legacy_security_v1_read_user',
  password: 'password',
  roles: [legacySecurityV1Read.name],
};

const legacySecurityV2ReadUser = {
  username: 'legacy_security_v2_read_user',
  password: 'password',
  roles: [legacySecurityV2Read.name],
};

const legacyRulesV2ReadUser = {
  username: 'legacy_rules_v2_read_user',
  password: 'password',
  roles: [legacyRulesV2Read.name],
};

const alertsV1ReadOnlyUser = {
  username: 'alerts_v1_read_only_user',
  password: 'password',
  roles: [alertsV1ReadOnly.name],
};

const usersToCreate = [
  legacyRulesV1ReadUser,
  legacySecurityV1ReadUser,
  legacySecurityV2ReadUser,
  legacyRulesV2ReadUser,
  alertsV1ReadOnlyUser,
];

const rolesToCreate = [
  legacyRulesV1Read,
  legacySecurityV1Read,
  legacySecurityV2Read,
  legacyRulesV2Read,
  alertsV1ReadOnly,
];

// ====================================
// Test Suite
// ====================================

describe('Legacy Alerts Privileges', { tags: ['@ess'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
    deleteAlertsAndRules();
    deleteUsersAndRoles(usersToCreate, rolesToCreate);
    createUsersAndRoles(usersToCreate, rolesToCreate);
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
    deleteUsersAndRoles(usersToCreate, rolesToCreate);
  });

  beforeEach(() => {
    // Login as admin to create rules and alerts
    loginWithUser(legacyRulesV1ReadUser);
    deleteAlertsAndRules();
    createRule(getCustomQueryRuleParams());
  });

  // ====================================
  // Legacy Rules V1 Read - SHOULD be able to manage alerts
  // ====================================
  describe('securitySolutionRulesV1.read (legacy)', () => {
    beforeEach(() => {
      loginWithUser(legacyRulesV1ReadUser);
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    it('should be able to acknowledge alerts', () => {
      markAcknowledgedFirstAlert();
      assertSuccessToast('Successfully marked 1 alert as acknowledged.');
      goToAcknowledgedAlerts();
      waitForAlertsToPopulate(1);
    });

    it('should be able to close alerts', () => {
      selectNumberOfAlerts(3);
      closeAlerts();
      assertSuccessToast('Successfully closed 3 alerts.', '');
    });

    it('should be able to open closed alerts', () => {
      // First close an alert
      selectNumberOfAlerts(1);
      closeAlerts();
      goToClosedAlerts();
      waitForAlerts();
      // Then open it
      openFirstAlert();
    });

    it('should be able to assign alerts', () => {
      sortUsingDataGridBtn('Assignees');
      const assignees = [legacyRulesV1ReadUser.username];
      updateAssigneesForFirstAlert(assignees);
      removeAllAssigneesForFirstAlert();
    });

    it('should be able to tag alerts', () => {
      addAlertTagToNAlerts(5);
    });
  });

  // ====================================
  // Legacy Rules V2 Read - SHOULD be able to manage alerts
  // ====================================
  describe('securitySolutionRulesV2.read (legacy)', () => {
    beforeEach(() => {
      loginWithUser(legacyRulesV2ReadUser);
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    it('should be able to acknowledge alerts', () => {
      markAcknowledgedFirstAlert();
    });

    it('should be able to close alerts', () => {
      selectNumberOfAlerts(2);
      closeAlerts();
      assertSuccessToast('Successfully closed 2 alerts.', '');
    });

    it('should be able to assign alerts', () => {
      sortUsingDataGridBtn('Assignees');
      const assignees = [legacyRulesV2ReadUser.username];
      updateAssigneesForFirstAlert(assignees);
      removeAllAssigneesForFirstAlert();
    });

    it('should be able to tag alerts', () => {
      addAlertTagToNAlerts(3);
    });
  });

  // ====================================
  // Alerts V1 Read Only - should NOT be able to manage alerts
  // ====================================
  describe('securitySolutionAlertsV1.read (new - no management)', () => {
    beforeEach(() => {
      loginWithUser(alertsV1ReadOnlyUser);
      visit(ALERTS_URL);
      waitForAlertsToPopulate();
    });

    it('should NOT be able to acknowledge alerts', () => {
      expandFirstAlertActions();
      cy.get(MARK_ALERT_ACKNOWLEDGED_BTN).should('not.exist');
    });

    it('should NOT be able to close alerts via context menu', () => {
      expandFirstAlertActions();
      cy.get(CLOSE_ALERT_BTN).should('not.exist');
    });

    it('should NOT be able to close alerts via bulk actions', () => {
      selectNumberOfAlerts(2);
      cy.get(TAKE_ACTION_POPOVER_BTN).click();
      cy.get(CLOSE_SELECTED_ALERTS_BTN).should('not.exist');
    });

    it('should NOT be able to assign alerts', () => {
      expandFirstAlertActions();
      cy.get(ALERT_ASSIGN_CONTEXT_MENU_ITEM).should('not.exist');
    });

    it('should NOT be able to tag alerts', () => {
      expandFirstAlertActions();
      cy.get(ALERT_TAGGING_CONTEXT_MENU_ITEM).should('not.exist');
    });
  });
});
