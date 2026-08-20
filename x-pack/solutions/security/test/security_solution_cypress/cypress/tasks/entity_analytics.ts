/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RISK_ENGINE_STATUS_URL,
  RISK_ENGINE_PRIVILEGES_URL,
} from '@kbn/security-solution-plugin/common/constants';
import { BASIC_TABLE_LOADING } from '../screens/common';
import {
  ANOMALIES_TABLE_ROWS,
  ANOMALIES_TABLE_ENABLE_JOB_BUTTON,
  ANOMALIES_TABLE_NEXT_PAGE_BUTTON,
  OPEN_RISK_INFORMATION_FLYOUT_BUTTON,
} from '../screens/entity_analytics';
import { ENTITY_ANALYTICS_URL } from '../urls/navigation';
import { visitWithTimeRange } from './navigation';
import { GET_DATE_PICKER_APPLY_BUTTON, GLOBAL_FILTERS_CONTAINER } from '../screens/date_picker';
import { REFRESH_BUTTON } from '../screens/security_header';
import {
  ENABLEMENT_MODAL_CONFIRM_BUTTON,
  ENTITIES_LIST_PANEL,
  ENTITY_STORE_ENABLEMENT_BUTTON,
  ENTITY_STORE_ENABLEMENT_MODAL,
} from '../screens/entity_analytics/dashboard';

export const updateDashboardTimeRange = () => {
  // eslint-disable-next-line cypress/no-force
  cy.get(GET_DATE_PICKER_APPLY_BUTTON(GLOBAL_FILTERS_CONTAINER)).click({ force: true }); // Force to fix global timerange flakiness
  // eslint-disable-next-line cypress/no-force
  cy.get(REFRESH_BUTTON).click({ force: true }); // Force to fix even more global timerange flakiness
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
};

export const waitForAnomaliesToBeLoaded = () => {
  cy.waitUntil(() => {
    visitWithTimeRange(ENTITY_ANALYTICS_URL);
    cy.get(BASIC_TABLE_LOADING).should('exist');
    cy.get(BASIC_TABLE_LOADING).should('not.exist');
    return cy.get(ANOMALIES_TABLE_ROWS).then((tableRows) => tableRows.length > 1);
  });
};

export const enableJob = () => {
  cy.get(ANOMALIES_TABLE_ENABLE_JOB_BUTTON).click();
};

export const navigateToNextPage = () => {
  cy.get(ANOMALIES_TABLE_NEXT_PAGE_BUTTON).click();
};

/**
 * The entity maintainers endpoint is called instead of RISK_ENGINE_STATUS_URL when
 * the `entityAnalyticsEntityStoreV2` experimental feature flag is enabled (default: true
 * on main). Both URLs must be mocked so the risk tables resolve out of loading state
 * regardless of which code path is active.
 */
const ENTITY_MAINTAINERS_URL = '/internal/security/entity_store/entity_maintainers*';

export const mockRiskEngineEnabled = () => {
  cy.intercept('GET', RISK_ENGINE_STATUS_URL, {
    statusCode: 200,
    body: {
      risk_engine_status: 'ENABLED',
    },
  }).as('riskEngineStatus');

  cy.intercept('GET', ENTITY_MAINTAINERS_URL, {
    statusCode: 200,
    body: {
      maintainers: [
        {
          id: 'risk-score',
          taskStatus: 'started',
          interval: '1h',
          description: null,
          nextRunAt: null,
          minLicense: 'platinum',
          customState: null,
          runs: 1,
          lastSuccessTimestamp: null,
          lastErrorTimestamp: null,
        },
      ],
    },
  }).as('entityMaintainers');
};

export const mockRiskEnginePrivileges = () => {
  cy.intercept('GET', RISK_ENGINE_PRIVILEGES_URL, {
    statusCode: 200,
    body: {
      has_all_required: true,
      has_read_permissions: true,
      has_write_permissions: true,
      privileges: {
        elasticsearch: {
          cluster: {},
          index: {
            'risk-score.risk-score-*': { read: true, write: true },
          },
        },
      },
    },
  }).as('riskEnginePrivileges');
};

const ENTITY_STORE_ENTITIES_URL = '/api/security/entity_store/entities*';

const entityStoreDsl = (entityIndex: string) =>
  JSON.stringify({
    index: [entityIndex],
    body: {
      query: { bool: { filter: [{ exists: { field: 'entity.risk.calculated_score_norm' } }] } },
    },
  });

/**
 * Intercepts the entity store v2 entities list API so that host/user risk score
 * tables render with stub data in environments where the entity store index is
 * not populated (e.g. CI inspect-button tests).
 *
 * Coverage note: `inspect.dsl` always echoes the hardcoded `entityIndex`, so
 * the table-case assertions on `INSPECT_MODAL_INDEX_PATTERN` are circular and
 * cannot detect a wrong-index regression. The KPI lens-visualization cases
 * (which use the search strategy, not this intercept) are unaffected.
 */
export const mockEntityStoreRiskScores = () => {
  const entityIndex = '.entities.v2.latest.default-00001';

  cy.intercept('GET', ENTITY_STORE_ENTITIES_URL, (req) => {
    const entityTypesParam = req.query?.entity_types;
    const entityTypes: string = Array.isArray(entityTypesParam)
      ? entityTypesParam.join(',')
      : String(entityTypesParam ?? '');
    const isHost = entityTypes.includes('host');
    const isUser = entityTypes.includes('user');

    const hostRecord = {
      '@timestamp': '2025-01-01T00:00:00.000Z',
      'host.name': 'mock-host',
      entity: {
        name: 'mock-host',
        type: 'node',
        risk: { calculated_score_norm: 70, calculated_level: 'High' },
      },
      host: {
        name: 'mock-host',
        risk: {
          calculated_score_norm: 70,
          calculated_level: 'High',
          rule_risks: [],
          multipliers: [],
        },
      },
    };

    const userRecord = {
      '@timestamp': '2025-01-01T00:00:00.000Z',
      'user.name': 'mock-user',
      entity: {
        name: 'mock-user',
        type: 'node',
        risk: { calculated_score_norm: 60, calculated_level: 'Medium' },
      },
      user: {
        name: 'mock-user',
        risk: {
          calculated_score_norm: 60,
          calculated_level: 'Medium',
          rule_risks: [],
          multipliers: [],
        },
      },
    };

    const records = isHost ? [hostRecord] : isUser ? [userRecord] : [];

    req.reply({
      statusCode: 200,
      body: {
        records,
        page: 1,
        per_page: 10,
        total: records.length,
        inspect: {
          dsl: [entityStoreDsl(entityIndex)],
          response: [JSON.stringify({ hits: { total: { value: records.length }, hits: [] } })],
        },
      },
    });
  }).as('entityStoreEntities');
};

export const openRiskInformationFlyout = () => cy.get(OPEN_RISK_INFORMATION_FLYOUT_BUTTON).click();

export const openEntityStoreEnablementModal = () => {
  cy.get(ENTITY_STORE_ENABLEMENT_BUTTON).click();
  cy.get(ENTITY_STORE_ENABLEMENT_MODAL).contains('Entity Analytics Enablement');

  cy.wait('@riskEnginePrivileges', { timeout: 120000 });
  cy.wait('@entityStorePrivileges', { timeout: 120000 });
};

export const confirmEntityStoreEnablement = () => {
  cy.get(ENABLEMENT_MODAL_CONFIRM_BUTTON).click();

  cy.get(ENTITY_STORE_ENABLEMENT_MODAL).should('not.exist');
};

export const waitForEntitiesListToAppear = () => {
  cy.get(ENTITIES_LIST_PANEL, { timeout: 30000 }).scrollIntoView();
  cy.get(ENTITIES_LIST_PANEL).contains('Entities');
};
