/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';

import { ALERTS_URL, ENTITY_ANALYTICS_URL } from '../../../../urls/navigation';

import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

import {
  ENABLE_HOST_RISK_SCORE_BUTTON,
  ENABLE_USER_RISK_SCORE_BUTTON,
  HOSTS_DONUT_CHART,
  HOSTS_TABLE_ROWS,
  HOST_RISK_SCORE_NO_DATA_DETECTED,
  USERS_DONUT_CHART,
  USERS_TABLE,
  USERS_TABLE_ROWS,
  USER_RISK_SCORE_NO_DATA_DETECTED,
  USERS_TABLE_ALERT_CELL,
  HOSTS_TABLE_ALERT_CELL,
  HOSTS_TABLE,
} from '../../../../screens/entity_analytics';
import {
  openRiskTableFilterAndSelectTheLowOption,
  removeLowFilterAndCloseRiskTableFilter,
} from '../../../../tasks/host_risk';
import { createRule } from '../../../../tasks/api_calls/rules';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import { getNewRule } from '../../../../objects/rule';
import { clickOnFirstHostsAlerts, clickOnFirstUsersAlerts } from '../../../../tasks/risk_scores';
import { OPTION_LIST_LABELS, OPTION_LIST_VALUES } from '../../../../screens/common/filter_group';
import { kqlSearch } from '../../../../tasks/security_header';
import { setEndDate, updateDates } from '../../../../tasks/date_picker';

const TEST_USER_ALERTS = 1;
const TEST_USER_NAME = 'test';
const SIEM_KIBANA_HOST_ALERTS = 1;
const SIEM_KIBANA_HOST_NAME = 'siem-kibana';
const DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
const DATE_BEFORE_ALERT_CREATION = moment().format(DATE_FORMAT);

describe('Entity Analytics Dashboard', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
  });

  describe('legacy risk score', () => {
    describe('Without data', () => {
      beforeEach(() => {
        login();
        visitWithTimeRange(ENTITY_ANALYTICS_URL);
      });

      it('shows enable host risk button', () => {
        cy.get(ENABLE_HOST_RISK_SCORE_BUTTON).should('be.visible');
      });

      it('shows enable user risk button', () => {
        cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('be.visible');
      });
    });

    describe('Risk Score enabled but still no data', () => {
      before(() => {
        cy.task('esArchiverLoad', { archiveName: 'risk_hosts_no_data' });
        cy.task('esArchiverLoad', { archiveName: 'risk_users_no_data' });
      });

      beforeEach(() => {
        login();
        visitWithTimeRange(ENTITY_ANALYTICS_URL);
      });

      after(() => {
        cy.task('esArchiverUnload', { archiveName: 'risk_hosts_no_data' });
        cy.task('esArchiverUnload', { archiveName: 'risk_users_no_data' });
      });

      it('shows no data detected prompt for host risk score module', () => {
        cy.get(HOST_RISK_SCORE_NO_DATA_DETECTED).should('be.visible');
      });

      it('shows no data detected prompt for user risk score module', () => {
        cy.get(USER_RISK_SCORE_NO_DATA_DETECTED).should('be.visible');
      });
    });

    describe('With Legacy data', () => {
      before(() => {
        cy.task('esArchiverLoad', { archiveName: 'risk_hosts_legacy_data' });
        cy.task('esArchiverLoad', { archiveName: 'risk_users_legacy_data' });
      });

      beforeEach(() => {
        login();
        visitWithTimeRange(ENTITY_ANALYTICS_URL);
      });

      after(() => {
        cy.task('esArchiverUnload', { archiveName: 'risk_hosts_legacy_data' });
        cy.task('esArchiverUnload', { archiveName: 'risk_users_legacy_data' });
      });

      it('shows enable host risk button', () => {
        cy.get(ENABLE_HOST_RISK_SCORE_BUTTON).should('be.visible');
      });

      it('shows enable user risk button', () => {
        cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('be.visible');
      });
    });

    describe('With host risk data', () => {
      before(() => {
        cy.task('esArchiverLoad', { archiveName: 'risk_hosts' });
      });

      beforeEach(() => {
        login();
        visitWithTimeRange(ENTITY_ANALYTICS_URL);
      });

      after(() => {
        cy.task('esArchiverUnload', { archiveName: 'risk_hosts' });
      });

      it('renders donut chart', () => {
        cy.get(HOSTS_DONUT_CHART).should('include.text', '6Total');
      });

      it('renders table', () => {
        cy.get(HOSTS_TABLE).should('be.visible');
        cy.get(HOSTS_TABLE_ROWS).should('have.length', 5);
      });

      it('renders alerts column', () => {
        cy.get(HOSTS_TABLE_ALERT_CELL).should('have.length', 5);
      });
      it('filters by risk level', () => {
        cy.get(HOSTS_TABLE).should('be.visible');
        cy.get(HOSTS_TABLE_ROWS).should('have.length', 5);

        openRiskTableFilterAndSelectTheLowOption();

        cy.get(HOSTS_DONUT_CHART).should('include.text', '1Total');
        cy.get(HOSTS_TABLE_ROWS).should('have.length', 1);

        removeLowFilterAndCloseRiskTableFilter();
      });

      it('filters the host risk table with KQL search bar query', () => {
        kqlSearch(`host.name : ${SIEM_KIBANA_HOST_NAME}{enter}`);

        cy.get(HOSTS_DONUT_CHART).should('include.text', '1Total');
        cy.get(HOSTS_TABLE_ROWS).should('have.length', 1);
      });

      // FLAKY: https://github.com/elastic/kibana/issues/178914
      describe.skip('With alerts data', () => {
        before(() => {
          createRule(getNewRule());
        });

        beforeEach(() => {
          login();
          visitWithTimeRange(ALERTS_URL);
          waitForAlertsToPopulate();
          visitWithTimeRange(ENTITY_ANALYTICS_URL);
        });

        after(() => {
          deleteAlertsAndRules();
        });

        it('populates alerts column', () => {
          cy.get(HOSTS_TABLE_ALERT_CELL).first().should('include.text', SIEM_KIBANA_HOST_ALERTS);
        });

        it('filters the alerts count with time range', () => {
          setEndDate(DATE_BEFORE_ALERT_CREATION);

          updateDates();

          cy.get(HOSTS_TABLE_ALERT_CELL).first().should('include.text', 0);
        });

        it('opens alerts page when alerts count is clicked', () => {
          clickOnFirstHostsAlerts();
          cy.url().should('include', ALERTS_URL);

          cy.get(OPTION_LIST_LABELS).eq(0).should('include.text', 'Status');
          cy.get(OPTION_LIST_VALUES(0)).should('include.text', 'open');
          cy.get(OPTION_LIST_LABELS).eq(1).should('include.text', 'Host');
          cy.get(OPTION_LIST_VALUES(1)).should('include.text', SIEM_KIBANA_HOST_NAME);
        });
      });
    });

    describe('With user risk data', () => {
      before(() => {
        cy.task('esArchiverLoad', { archiveName: 'risk_users' });
      });

      beforeEach(() => {
        login();
        visitWithTimeRange(ENTITY_ANALYTICS_URL);
      });

      after(() => {
        cy.task('esArchiverUnload', { archiveName: 'risk_users' });
      });

      it('renders donut chart', () => {
        cy.get(USERS_DONUT_CHART).should('include.text', '7Total');
      });

      it('renders table', () => {
        cy.get(USERS_TABLE).should('be.visible');
        cy.get(USERS_TABLE_ROWS).should('have.length', 5);
      });

      it('renders alerts column', () => {
        cy.get(USERS_TABLE_ALERT_CELL).should('have.length', 5);
      });

      it('filters by risk level', () => {
        cy.get(USERS_TABLE).should('be.visible');
        cy.get(USERS_TABLE_ROWS).should('have.length', 5);

        openRiskTableFilterAndSelectTheLowOption();

        cy.get(USERS_DONUT_CHART).should('include.text', '2Total');
        cy.get(USERS_TABLE_ROWS).should('have.length', 2);

        removeLowFilterAndCloseRiskTableFilter();
      });

      it('filters the host risk table with KQL search bar query', () => {
        kqlSearch(`user.name : ${TEST_USER_NAME}{enter}`);

        cy.get(USERS_DONUT_CHART).should('include.text', '1Total');
        cy.get(USERS_TABLE_ROWS).should('have.length', 1);
      });

      describe('With alerts data', () => {
        before(() => {
          createRule(getNewRule());
        });

        beforeEach(() => {
          login();
          visitWithTimeRange(ALERTS_URL);
          waitForAlertsToPopulate();
          visitWithTimeRange(ENTITY_ANALYTICS_URL);
        });

        after(() => {
          deleteAlertsAndRules();
        });

        it('populates alerts column', () => {
          cy.get(USERS_TABLE_ALERT_CELL).first().should('include.text', TEST_USER_ALERTS);
        });

        it('filters the alerts count with time range', () => {
          setEndDate(DATE_BEFORE_ALERT_CREATION);
          updateDates();

          cy.get(USERS_TABLE_ALERT_CELL).first().should('include.text', 0);
        });

        it('opens alerts page when alerts count is clicked', () => {
          clickOnFirstUsersAlerts();

          cy.url().should('include', ALERTS_URL);

          cy.get(OPTION_LIST_LABELS).eq(0).should('include.text', 'Status');
          cy.get(OPTION_LIST_VALUES(0)).should('include.text', 'open');
          cy.get(OPTION_LIST_LABELS).eq(1).should('include.text', 'User');
          cy.get(OPTION_LIST_VALUES(1)).should('include.text', TEST_USER_NAME);
        });
      });
    });
  });
});
