/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { parseDuration } from '@kbn/alerting-plugin/server';
import { FindActionResult } from '@kbn/actions-plugin/server';
import { DynamicSettingsAttributes } from '../../runtime_types/settings';
import { savedObjectsAdapter } from '../../saved_objects';
import { populateAlertActions } from '../../../common/rules/alert_actions';
import {
  SyntheticsMonitorStatusTranslations,
  TlsTranslations,
} from '../../../common/rules/synthetics/translations';
import { SyntheticsServerSetup, UptimeRequestHandlerContext } from '../../types';
import {
  ACTION_GROUP_DEFINITIONS,
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../common/constants/synthetics_alerts';
import { DefaultRuleType, SyntheticsDefaultRule } from '../../../common/types/default_alerts';

export class DefaultAlertService {
  context: UptimeRequestHandlerContext;
  soClient: SavedObjectsClientContract;
  server: SyntheticsServerSetup;
  settings?: DynamicSettingsAttributes;

  constructor(
    context: UptimeRequestHandlerContext,
    server: SyntheticsServerSetup,
    soClient: SavedObjectsClientContract
  ) {
    this.context = context;
    this.server = server;
    this.soClient = soClient;
  }

  async getSettings() {
    if (!this.settings) {
      this.settings = await savedObjectsAdapter.getSyntheticsDynamicSettings(this.soClient);
    }
    return this.settings;
  }

  async setupDefaultAlerts(spaceId: string) {
    console.log('SETUP DEFAULT ALERTS WITH ', spaceId);
    this.settings = await this.getSettings();

    const [statusRule, tlsRule] = await Promise.allSettled([
      this.setupStatusRule(spaceId),
      this.setupTlsRule(spaceId),
    ]);

    if (statusRule.status === 'rejected') {
      throw statusRule.reason;
    }
    if (tlsRule.status === 'rejected') {
      throw tlsRule.reason;
    }

    return {
      statusRule: statusRule.status === 'fulfilled' && statusRule.value ? statusRule.value : null,
      tlsRule: tlsRule.status === 'fulfilled' && tlsRule.value ? tlsRule.value : null,
    };
  }

  getMinimumRuleInterval() {
    const minimumInterval = this.server.alerting.getConfig().minimumScheduleInterval;
    const minimumIntervalInMs = parseDuration(minimumInterval.value);
    const defaultIntervalInMs = parseDuration('1m');
    const interval = minimumIntervalInMs < defaultIntervalInMs ? '1m' : minimumInterval.value;
    return interval;
  }

  setupStatusRule(spaceId: string) {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    if (this.settings?.defaultStatusRuleEnabled === false) {
      console.log('I NOT GONNA CREATE CAUSE DISABLED');
      return;
    }
    console.log('CALLING CREATE DEFAULT RULE FROM SETUP STATUS RULE');
    return this.createDefaultRuleIfNotExist(
      SYNTHETICS_STATUS_RULE,
      `Synthetics status internal rule`,
      minimumRuleInterval,
      spaceId
    );
  }

  setupTlsRule(spaceId: string) {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    if (this.settings?.defaultTLSRuleEnabled === false) {
      return;
    }
    return this.createDefaultRuleIfNotExist(
      SYNTHETICS_TLS_RULE,
      `Synthetics internal TLS rule`,
      minimumRuleInterval,
      spaceId
    );
  }

  async getExistingAlert(ruleType: DefaultRuleType): Promise<SyntheticsDefaultRule | undefined> {
    const rulesClient = await (await this.context.alerting)?.getRulesClient();

    const { data } = await rulesClient.find({
      options: {
        page: 1,
        perPage: 1,
        filter: `alert.attributes.alertTypeId:(${ruleType}) AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
      },
    });

    if (data.length === 0) {
      return;
    }
    const { actions = [], systemActions = [], ...alert } = data[0];
    return { ...alert, actions: [...actions, ...systemActions], ruleTypeId: alert.alertTypeId };
  }

  async createDefaultRuleIfNotExist(
    ruleType: DefaultRuleType,
    name: string,
    interval: string,
    spaceId: string
  ): Promise<SyntheticsDefaultRule | undefined> {
    // short circuit if the rule already exists
    let defaultRule = await this.getExistingAlert(ruleType);
    if (defaultRule) {
      return defaultRule;
    }

    const actions = await this.getRuleActions(ruleType);
    const rulesClient = await (await this.context.alerting)?.getRulesClient();
    try {
      // create the rule with hardcoded ID (we only ever want one of these)
      // the request will fail if the rule already exists
      const {
        actions: actionsFromRules = [],
        systemActions = [],
        ...newAlert
      } = await rulesClient.create({
        data: {
          actions,
          params: {},
          consumer: 'uptime',
          alertTypeId: ruleType,
          schedule: { interval },
          tags: ['SYNTHETICS_DEFAULT_ALERT'],
          name,
          enabled: true,
          throttle: null,
        },
        options: {
          id: `SYNTHETICS_DEFAULT_ALERT-${ruleType}-${spaceId}`,
        },
      });
      defaultRule = {
        ...newAlert,
        actions: [...actionsFromRules, ...systemActions],
        ruleTypeId: newAlert.alertTypeId,
      };
      console.log('default rule created', defaultRule);
    } catch (error) {
      if (error.message && !error.message.includes('document already exists')) {
        this.server.logger.error(`Error creating default alert for ${ruleType}: ${error.message}`);
        throw error;
      } else {
        this.server.logger.error('Encountered error creating default rule', error.message);
      }
    }
    if (defaultRule) return defaultRule;
    /**
     * If `defaultRule` is falsy, it means the rule already exists and the
     * alerting API rejected the create request.
     *
     * In this case, we just query again for the rule. This can return `undefined`
     * if there was an exception in the create request unrelated to the rule already existing,
     * but we assume that the rule exists if we reach this point.
     */
    const t = await this.getExistingAlert(ruleType);
    console.log('trying to get existing alert', t);
    if (t) return t;
    try {
      console.log('GOING FOR ROUND NUMBER 2!!!!!!!!!!!!!');
      // create the rule with hardcoded ID (we only ever want one of these)
      // the request will fail if the rule already exists
      const {
        actions: actionsFromRules = [],
        systemActions = [],
        ...newAlert
      } = await rulesClient.create({
        data: {
          actions,
          params: {},
          consumer: 'uptime',
          alertTypeId: ruleType,
          schedule: { interval },
          tags: ['SYNTHETICS_DEFAULT_ALERT'],
          name,
          enabled: true,
          throttle: null,
        },
        options: {
          id: `SYNTHETICS_DEFAULT_ALERT-${ruleType}-${spaceId}`,
        },
      });
      defaultRule = {
        ...newAlert,
        actions: [...actionsFromRules, ...systemActions],
        ruleTypeId: newAlert.alertTypeId,
      };
      console.log('default rule created', defaultRule);
    } catch (error) {
      if (error.message && !error.message.includes('document already exists')) {
        this.server.logger.error(`Error creating default alert for ${ruleType}: ${error.message}`);
        throw error;
      } else {
        this.server.logger.error('Encountered error creating default rule', error.message);
      }
    }
    return defaultRule;
  }

  async updateStatusRule(spaceId: string, enabled?: boolean) {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    console.log('update status rule', minimumRuleInterval);
    if (enabled) {
      console.log('enabled, calling upsert', spaceId);
      return this.upsertDefaultAlert(
        SYNTHETICS_STATUS_RULE,
        `Synthetics status internal rule`,
        minimumRuleInterval,
        spaceId
      );
    } else {
      console.trace('rule not enabled, getting rules client and deleting rules');
      const rulesClient = await (await this.context.alerting)?.getRulesClient();
      try {
        await rulesClient.bulkDeleteRules({
          filter: `alert.attributes.alertTypeId:"${SYNTHETICS_STATUS_RULE}" AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
        });
        console.log('after bulk delete has succeeded');
      } catch (error) {
        console.log('could be some issue here');
        console.log(
          'searching for saved objects',
          await rulesClient.find({
            options: {
              page: 1,
              perPage: 1,
              filter: `alert.attributes.alertTypeId:(${SYNTHETICS_STATUS_RULE}) AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
            },
          })
        );
      }
    }
  }

  async updateTlsRule(spaceId: string, enabled?: boolean) {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    if (enabled) {
      return this.upsertDefaultAlert(
        SYNTHETICS_TLS_RULE,
        `Synthetics internal TLS rule`,
        minimumRuleInterval,
        spaceId
      );
    } else {
      const rulesClient = await (await this.context.alerting)?.getRulesClient();
      await rulesClient.bulkDeleteRules({
        filter: `alert.attributes.alertTypeId:"${SYNTHETICS_TLS_RULE}" AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
      });
    }
  }

  async upsertDefaultAlert(
    ruleType: DefaultRuleType,
    name: string,
    interval: string,
    spaceId: string
  ) {
    console.log('upsert default alert', ruleType, name, interval, spaceId);
    const rulesClient = await (await this.context.alerting)?.getRulesClient();

    const alert = await this.getExistingAlert(ruleType);
    console.log('existing alert result', alert);
    if (alert) {
      const currentIntervalInMs = parseDuration(alert.schedule.interval);
      const minimumIntervalInMs = parseDuration(interval);
      const actions = await this.getRuleActions(ruleType);
      console.log('calling update on rules client');
      const {
        actions: actionsFromRules = [],
        systemActions = [],
        ...updatedAlert
      } = await rulesClient.update({
        id: alert.id,
        data: {
          actions,
          name: alert.name,
          tags: alert.tags,
          schedule: {
            interval:
              currentIntervalInMs < minimumIntervalInMs ? interval : alert.schedule.interval,
          },
          params: alert.params,
        },
      });
      console.log('updated alert result', updatedAlert);
      return {
        ...updatedAlert,
        actions: [...actionsFromRules, ...systemActions],
        ruleTypeId: updatedAlert.alertTypeId,
      };
    }

    console.log('I have to call the create default rule');
    return this.createDefaultRuleIfNotExist(ruleType, name, interval, spaceId);
  }

  async getRuleActions(ruleType: DefaultRuleType) {
    const { actionConnectors, settings } = await this.getActionConnectors();

    const defaultActions = (actionConnectors ?? []).filter((act) =>
      settings?.defaultConnectors?.includes(act.id)
    );

    if (ruleType === SYNTHETICS_STATUS_RULE) {
      return populateAlertActions({
        defaultActions,
        groupId: ACTION_GROUP_DEFINITIONS.MONITOR_STATUS.id,
        defaultEmail: settings?.defaultEmail!,
        translations: {
          defaultActionMessage: SyntheticsMonitorStatusTranslations.defaultActionMessage,
          defaultRecoveryMessage: SyntheticsMonitorStatusTranslations.defaultRecoveryMessage,
          defaultSubjectMessage: SyntheticsMonitorStatusTranslations.defaultSubjectMessage,
          defaultRecoverySubjectMessage:
            SyntheticsMonitorStatusTranslations.defaultRecoverySubjectMessage,
        },
      });
    } else {
      return populateAlertActions({
        defaultActions,
        groupId: ACTION_GROUP_DEFINITIONS.TLS_CERTIFICATE.id,
        defaultEmail: settings?.defaultEmail!,
        translations: {
          defaultActionMessage: TlsTranslations.defaultActionMessage,
          defaultRecoveryMessage: TlsTranslations.defaultRecoveryMessage,
          defaultSubjectMessage: TlsTranslations.defaultSubjectMessage,
          defaultRecoverySubjectMessage: TlsTranslations.defaultRecoverySubjectMessage,
        },
      });
    }
  }

  async getActionConnectors() {
    const actionsClient = (await this.context.actions)?.getActionsClient();
    if (!this.settings) {
      this.settings = await savedObjectsAdapter.getSyntheticsDynamicSettings(this.soClient);
    }
    let actionConnectors: FindActionResult[] = [];
    try {
      actionConnectors = await actionsClient.getAll();
    } catch (error) {
      this.server.logger.error(`Error getting connectors, Error: ${error.message}`, { error });
    }
    return { actionConnectors, settings: this.settings };
  }
}
