/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { PerformRuleInstallationResponseBody } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { generateEvent } from '../../../../objects/event';
import { createDocument, deleteDataStream } from '../../../../tasks/api_calls/elasticsearch';
import { createRuleAssetSavedObject } from '../../../../helpers/rules';
import { INTEGRATION_LINK, INTEGRATION_STATUS } from '../../../../screens/rule_details';
import {
  INTEGRATIONS_POPOVER,
  INTEGRATIONS_POPOVER_TITLE,
  RULE_NAME,
} from '../../../../screens/alerts_detection_rules';
import {
  installPrebuiltRuleAssets,
  installSpecificPrebuiltRulesRequest,
  SAMPLE_PREBUILT_RULE,
} from '../../../../tasks/api_calls/prebuilt_rules';
import { cleanFleet } from '../../../../tasks/api_calls/fleet';
import {
  disableRelatedIntegrations,
  enableRelatedIntegrations,
} from '../../../../tasks/api_calls/kibana_advanced_settings';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visitRulesManagementTable } from '../../../../tasks/rules_management';
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import {
  installIntegrations,
  PackagePolicyWithoutAgentPolicyId,
} from '../../../../tasks/api_calls/integrations';
import {
  disableAutoRefresh,
  openIntegrationsPopover,
} from '../../../../tasks/alerts_detection_rules';
import { fetchRuleAlerts } from '../../../../tasks/api_calls/alerts';
import {
  clickEnableRuleSwitch,
  visitRuleDetailsPage,
  waitForPageToBeLoaded,
} from '../../../../tasks/rule_details';

// https://github.com/elastic/kibana/issues/179943

describe('Related integrations', { tags: ['@ess', '@serverless', '@skipInServerless'] }, () => {
  const DATA_STREAM_NAME = 'logs-related-integrations-test';
  const PREBUILT_RULE_NAME = 'Prebuilt rule with related integrations';
  const RULE_RELATED_INTEGRATIONS: IntegrationDefinition[] = [
    {
      package: 'aws',
      version: '1.17.0',
      integration: 'cloudfront',
      installed: true,
      enabled: true,
    },
    {
      package: 'aws',
      version: '1.17.0',
      integration: 'cloudtrail',
      installed: true,
      enabled: false,
    },
    {
      package: 'aws',
      version: '1.17.0',
      integration: 'unknown',
      installed: false,
      enabled: false,
    },
    { package: 'system', version: '1.17.0', installed: true, enabled: true },
  ];
  const PREBUILT_RULE = createRuleAssetSavedObject({
    name: PREBUILT_RULE_NAME,
    index: [DATA_STREAM_NAME],
    query: '*:*',
    rule_id: 'rule_1',
    related_integrations: RULE_RELATED_INTEGRATIONS.map((x) => omit(x, ['installed', 'enabled'])),
  });

  beforeEach(() => {
    login();
    cleanFleet();
    deleteAlertsAndRules();
    addAndInstallPrebuiltRules([PREBUILT_RULE]);
  });

  describe('integrations not installed', () => {
    describe('rules management table', () => {
      beforeEach(() => {
        visitRulesManagementTable();
        disableAutoRefresh();
      });

      it('should display a badge with the installed integrations', () => {
        cy.get(INTEGRATIONS_POPOVER).should(
          'have.text',
          `0/${RULE_RELATED_INTEGRATIONS.length} integrations`
        );
      });

      it('should display a popover when clicking the badge with the installed integrations', () => {
        openIntegrationsPopover();

        cy.get(INTEGRATIONS_POPOVER_TITLE).should(
          'have.text',
          `[${RULE_RELATED_INTEGRATIONS.length}] Related integrations available`
        );
        cy.get(INTEGRATION_LINK).should('have.length', RULE_RELATED_INTEGRATIONS.length);
        cy.get(INTEGRATION_STATUS).should('have.length', RULE_RELATED_INTEGRATIONS.length);

        RULE_RELATED_INTEGRATIONS.forEach((integration, index) => {
          cy.get(INTEGRATION_LINK).eq(index).contains(getIntegrationName(integration), {
            matchCase: false,
          });
          cy.get(INTEGRATION_STATUS).eq(index).should('have.text', 'Not installed');
        });
      });
    });

    describe('rule details', () => {
      beforeEach(() => {
        visitFirstInstalledPrebuiltRuleDetailsPage();
      });

      it('should display the integrations in the definition section', () => {
        cy.get(INTEGRATION_LINK).should('have.length', RULE_RELATED_INTEGRATIONS.length);
        cy.get(INTEGRATION_STATUS).should('have.length', RULE_RELATED_INTEGRATIONS.length);

        RULE_RELATED_INTEGRATIONS.forEach((integration, index) => {
          cy.get(INTEGRATION_LINK).eq(index).contains(getIntegrationName(integration), {
            matchCase: false,
          });
          cy.get(INTEGRATION_STATUS).eq(index).should('have.text', 'Not installed');
        });
      });
    });
  });

  describe('integrations installed (AWS CloudFront (enabled), AWS CloudTrail (disabled), System (enabled))', () => {
    beforeEach(() => {
      installIntegrations({
        packages: [
          { name: 'aws', version: '1.17.0' },
          { name: 'system', version: '1.17.0' },
        ],
        agentPolicy: {
          name: 'Agent policy',
          namespace: 'default',
          monitoring_enabled: ['logs'],
          inactivity_timeout: 1209600,
        },
        packagePolicy: AWS_PACKAGE_POLICY,
      });
    });

    describe('rules management table', () => {
      beforeEach(() => {
        visitRulesManagementTable();
        disableAutoRefresh();
      });

      it('should display a badge with the installed integrations', () => {
        const enabledIntegrations = RULE_RELATED_INTEGRATIONS.filter((x) => x.enabled).length;
        const totalIntegrations = RULE_RELATED_INTEGRATIONS.length;

        cy.get(INTEGRATIONS_POPOVER).should(
          'have.text',
          `${enabledIntegrations}/${totalIntegrations} integrations`
        );
      });

      it('should display a popover when clicking the badge with the installed integrations', () => {
        openIntegrationsPopover();

        cy.get(INTEGRATIONS_POPOVER_TITLE).should(
          'have.text',
          `[${RULE_RELATED_INTEGRATIONS.length}] Related integrations available`
        );
        cy.get(INTEGRATION_LINK).should('have.length', RULE_RELATED_INTEGRATIONS.length);
        cy.get(INTEGRATION_STATUS).should('have.length', RULE_RELATED_INTEGRATIONS.length);

        RULE_RELATED_INTEGRATIONS.forEach((integration, index) => {
          cy.get(INTEGRATION_LINK).eq(index).contains(getIntegrationName(integration), {
            matchCase: false,
          });
          cy.get(INTEGRATION_STATUS)
            .eq(index)
            .should('have.text', getIntegrationStatus(integration));
        });
      });
    });

    describe('rule details', () => {
      beforeEach(() => {
        visitFirstInstalledPrebuiltRuleDetailsPage();
        waitForPageToBeLoaded(PREBUILT_RULE_NAME);
      });

      it('should display the integrations in the definition section', () => {
        cy.get(INTEGRATION_LINK).should('have.length', RULE_RELATED_INTEGRATIONS.length);
        cy.get(INTEGRATION_STATUS).should('have.length', RULE_RELATED_INTEGRATIONS.length);

        RULE_RELATED_INTEGRATIONS.forEach((integration, index) => {
          cy.get(INTEGRATION_LINK).eq(index).contains(getIntegrationName(integration), {
            matchCase: false,
          });
          cy.get(INTEGRATION_STATUS)
            .eq(index)
            .should('have.text', getIntegrationStatus(integration));
        });
      });

      const RELATED_INTEGRATION_FIELD = 'kibana.alert.rule.parameters.related_integrations';

      it(`the alerts generated should have a "${RELATED_INTEGRATION_FIELD}" field containing the integrations`, () => {
        deleteDataStream(DATA_STREAM_NAME);
        createDocument(DATA_STREAM_NAME, generateEvent());

        clickEnableRuleSwitch();
        waitForAlertsToPopulate();

        fetchRuleAlerts({
          ruleId: 'rule_1',
          fields: [RELATED_INTEGRATION_FIELD],
          size: 1,
        }).then((alertsResponse) => {
          expect(alertsResponse.body.hits.hits[0].fields).to.deep.equal({
            [RELATED_INTEGRATION_FIELD]: RULE_RELATED_INTEGRATIONS.map((x) =>
              omit(x, ['installed', 'enabled'])
            ),
          });
        });
      });
    });
  });

  describe('related Integrations Advanced Setting is disabled', () => {
    describe('rules management table', () => {
      beforeEach(() => {
        disableRelatedIntegrations();
        visitRulesManagementTable();
        disableAutoRefresh();
      });

      afterEach(() => {
        enableRelatedIntegrations();
      });

      it('should not display a badge with the installed integrations', () => {
        cy.get(RULE_NAME).should('have.text', PREBUILT_RULE_NAME);
        cy.get(INTEGRATION_LINK).should('not.exist');
      });
    });

    describe('rule details', () => {
      beforeEach(() => {
        visitFirstInstalledPrebuiltRuleDetailsPage();
      });

      it('should display the integrations in the definition section', () => {
        cy.get(INTEGRATION_LINK).should('have.length', RULE_RELATED_INTEGRATIONS.length);
        cy.get(INTEGRATION_STATUS).should('have.length', RULE_RELATED_INTEGRATIONS.length);

        RULE_RELATED_INTEGRATIONS.forEach((integration, index) => {
          cy.get(INTEGRATION_LINK).eq(index).contains(getIntegrationName(integration), {
            matchCase: false,
          });
          cy.get(INTEGRATION_STATUS).eq(index).should('have.text', 'Not installed');
        });
      });
    });
  });
});

const INSTALLED_PREBUILT_RULES_RESPONSE_ALIAS = 'prebuiltRules';

function addAndInstallPrebuiltRules(rules: Array<typeof SAMPLE_PREBUILT_RULE>): void {
  installPrebuiltRuleAssets(rules);
  installSpecificPrebuiltRulesRequest(rules).as(INSTALLED_PREBUILT_RULES_RESPONSE_ALIAS);
}

function visitFirstInstalledPrebuiltRuleDetailsPage(): void {
  cy.get<Cypress.Response<PerformRuleInstallationResponseBody>>(
    `@${INSTALLED_PREBUILT_RULES_RESPONSE_ALIAS}`
  ).then((response) => visitRuleDetailsPage(response.body.results.created[0].id));
}

interface IntegrationDefinition {
  package: string;
  version: string;
  installed: boolean;
  enabled: boolean;
  integration?: string;
}

function getIntegrationName(integration: IntegrationDefinition): string {
  return `${integration.package} ${integration.integration ?? ''}`.trim();
}

function getIntegrationStatus(integration: IntegrationDefinition): string {
  return `${integration.installed ? 'Installed' : 'Not installed'}${
    integration.enabled ? ': enabled' : ''
  }`.trim();
}

/**
 * AWS package policy has been generated by Kibana. Instead of copying the whole output the policy below
 * contains only required for testing inputs.
 */
const AWS_PACKAGE_POLICY: PackagePolicyWithoutAgentPolicyId = {
  package: {
    name: 'aws',
    version: '1.17.0',
  },
  name: 'aws-1',
  namespace: 'default',
  inputs: {
    'cloudtrail-aws-s3': {
      enabled: false,
      streams: {
        'aws.cloudtrail': {
          enabled: true,
          vars: {
            fips_enabled: false,
            tags: ['forwarded', 'aws-cloudtrail'],
            preserve_original_event: false,
            cloudtrail_regex: '/CloudTrail/',
            cloudtrail_digest_regex: '/CloudTrail-Digest/',
            cloudtrail_insight_regex: '/CloudTrail-Insight/',
            max_number_of_messages: 5,
          },
        },
      },
    },
    'elb-aws-s3': {
      enabled: false,
      streams: {
        'aws.elb_logs': {
          enabled: true,
          vars: {
            fips_enabled: false,
            tags: ['forwarded', 'aws-elb-logs'],
            preserve_original_event: false,
            max_number_of_messages: 5,
          },
        },
      },
    },
    'firewall-aws-s3': {
      enabled: false,
      streams: {
        'aws.firewall_logs': {
          enabled: true,
          vars: {
            fips_enabled: false,
            tags: ['forwarded', 'aws-firewall-logs'],
            preserve_original_event: false,
            max_number_of_messages: 5,
          },
        },
      },
    },
    's3-aws-s3': {
      enabled: false,
      streams: {
        'aws.s3access': {
          enabled: true,
          vars: {
            fips_enabled: false,
            tags: ['forwarded', 'aws-s3access'],
            preserve_original_event: false,
            max_number_of_messages: 5,
          },
        },
      },
    },
    'waf-aws-s3': {
      enabled: false,
      streams: {
        'aws.waf': {
          enabled: true,
          vars: {
            fips_enabled: false,
            tags: ['forwarded', 'aws-waf'],
            preserve_original_event: false,
            max_number_of_messages: 5,
          },
        },
      },
    },
    'cloudfront-aws-s3': {
      enabled: true,
      streams: {
        'aws.cloudfront_logs': {
          enabled: true,
          vars: {
            queue_url: 'https://example.com',
            fips_enabled: false,
            tags: ['forwarded', 'aws-cloudfront'],
            preserve_original_event: false,
            max_number_of_messages: 5,
          },
        },
      },
    },
  },
};
