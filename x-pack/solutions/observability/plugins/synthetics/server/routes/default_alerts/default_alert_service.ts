/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, pick } from 'lodash';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { parseDuration } from '@kbn/alerting-plugin/server';
import type { RuleAction, RuleSystemAction } from '@kbn/alerting-plugin/common';
import type { FindActionResult } from '@kbn/actions-plugin/server';
import { getSyntheticsDynamicSettings } from '../../saved_objects/synthetics_settings';
import type { DynamicSettingsAttributes } from '../../runtime_types/settings';
import { populateAlertActions } from '../../../common/rules/alert_actions';
import {
  SyntheticsMonitorStatusTranslations,
  TlsTranslations,
} from '../../../common/rules/synthetics/translations';
import type { SyntheticsServerSetup, UptimeRequestHandlerContext } from '../../types';
import {
  ACTION_GROUP_DEFINITIONS,
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../common/constants/synthetics_alerts';
import type { DefaultRuleType } from '../../../common/types/default_alerts';
export class DefaultRuleService {
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
      this.settings = await getSyntheticsDynamicSettings(this.soClient);
    }
    return this.settings;
  }

  async setupDefaultRules() {
    this.settings = await this.getSettings();

    const [statusRule, tlsRule] = await Promise.allSettled([
      this.setupStatusRule(),
      this.setupTlsRule(),
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

  setupStatusRule() {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    if (this.settings?.defaultStatusRuleEnabled === false) {
      return;
    }
    return this.createDefaultRuleIfNotExist(
      SYNTHETICS_STATUS_RULE,
      `Synthetics status internal rule`,
      minimumRuleInterval
    );
  }

  setupTlsRule() {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    if (this.settings?.defaultTLSRuleEnabled === false) {
      return;
    }
    return this.createDefaultRuleIfNotExist(
      SYNTHETICS_TLS_RULE,
      `Synthetics internal TLS rule`,
      minimumRuleInterval
    );
  }

  async getExistingAlert(ruleType: DefaultRuleType) {
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

  async createDefaultRuleIfNotExist(ruleType: DefaultRuleType, name: string, interval: string) {
    const alert = await this.getExistingAlert(ruleType);
    if (alert) {
      return alert;
    }

    const actions = await this.getAlertActions(ruleType);
    const rulesClient = await (await this.context.alerting)?.getRulesClient();
    const {
      actions: actionsFromRules = [],
      systemActions = [],
      ...newAlert
    } = await rulesClient.create<{}>({
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
    });

    return {
      ...newAlert,
      actions: [...actionsFromRules, ...systemActions],
      ruleTypeId: newAlert.alertTypeId,
    };
  }

  async updateStatusRule(enabled?: boolean) {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    if (enabled) {
      return this.upsertDefaultRule(
        SYNTHETICS_STATUS_RULE,
        `Synthetics status internal rule`,
        minimumRuleInterval
      );
    } else {
      const rulesClient = await (await this.context.alerting)?.getRulesClient();
      await rulesClient.bulkDeleteRules({
        filter: `alert.attributes.alertTypeId:"${SYNTHETICS_STATUS_RULE}" AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
      });
    }
  }

  async updateTlsRule(enabled?: boolean) {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    if (enabled) {
      return this.upsertDefaultRule(
        SYNTHETICS_TLS_RULE,
        `Synthetics internal TLS rule`,
        minimumRuleInterval
      );
    } else {
      const rulesClient = await (await this.context.alerting)?.getRulesClient();
      await rulesClient.bulkDeleteRules({
        filter: `alert.attributes.alertTypeId:"${SYNTHETICS_TLS_RULE}" AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
      });
    }
  }

  /** Rebuilds settings-managed actions of existing default rules from `settings` (not yet persisted); never creates or deletes rules. */
  async refreshDefaultRuleActions(
    settings: DynamicSettingsAttributes,
    previousDefaultConnectors: string[]
  ) {
    this.settings = settings;
    const interval = this.getMinimumRuleInterval();
    const ruleTypes: DefaultRuleType[] = [SYNTHETICS_STATUS_RULE, SYNTHETICS_TLS_RULE];
    await Promise.all(
      ruleTypes.map(async (ruleType) => {
        const alert = await this.getExistingAlert(ruleType);
        if (alert) {
          await this.updateExistingRule(ruleType, alert, interval, {
            previousDefaultConnectors,
            failOnConnectorError: true,
          });
        }
      })
    );
  }

  async upsertDefaultRule(ruleType: DefaultRuleType, name: string, interval: string) {
    const alert = await this.getExistingAlert(ruleType);
    if (alert) {
      return this.updateExistingRule(ruleType, alert, interval);
    }

    return await this.createDefaultRuleIfNotExist(ruleType, name, interval);
  }

  private async updateExistingRule(
    ruleType: DefaultRuleType,
    alert: NonNullable<Awaited<ReturnType<DefaultRuleService['getExistingAlert']>>>,
    interval: string,
    {
      previousDefaultConnectors = [],
      failOnConnectorError = false,
    }: { previousDefaultConnectors?: string[]; failOnConnectorError?: boolean } = {}
  ) {
    const rulesClient = await (await this.context.alerting)?.getRulesClient();
    const currentIntervalInMs = parseDuration(alert.schedule.interval);
    const minimumIntervalInMs = parseDuration(interval);
    const settings = await this.getSettings();
    const settingsManagedConnectorIds = new Set([
      ...previousDefaultConnectors,
      ...(settings?.defaultConnectors ?? []),
    ]);
    // Only settings-managed connectors are rebuilt; actions users added on the rule are kept.
    const userAddedActions = alert.actions
      .filter(
        (action): action is RuleAction =>
          'group' in action && !settingsManagedConnectorIds.has(action.id)
      )
      .map((action) => omit(action, 'actionTypeId'));
    const preservedSystemActions = alert.actions
      .filter((action): action is RuleSystemAction => !('group' in action))
      .map((action) => pick(action, ['id', 'params', 'uuid']));
    const actions = [
      ...userAddedActions,
      ...(await this.getAlertActions(ruleType, failOnConnectorError)),
    ];
    const {
      actions: actionsFromRules = [],
      systemActions = [],
      ...updatedAlert
    } = await rulesClient.update({
      id: alert.id,
      data: {
        actions,
        systemActions: preservedSystemActions,
        name: alert.name,
        tags: alert.tags,
        schedule: {
          interval: currentIntervalInMs < minimumIntervalInMs ? interval : alert.schedule.interval,
        },
        params: alert.params,
        artifacts: alert.artifacts ?? undefined,
      },
    });
    return {
      ...updatedAlert,
      actions: [...actionsFromRules, ...systemActions],
      ruleTypeId: updatedAlert.alertTypeId,
    };
  }

  async getAlertActions(ruleType: DefaultRuleType, failOnConnectorError = false) {
    const { actionConnectors, settings } = await this.getActionConnectors(failOnConnectorError);

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

  async getActionConnectors(failOnError = false) {
    const actionsClient = (await this.context.actions)?.getActionsClient();
    if (!this.settings) {
      this.settings = await getSyntheticsDynamicSettings(this.soClient);
    }
    let actionConnectors: FindActionResult[] = [];
    try {
      actionConnectors = await actionsClient.getAll();
    } catch (error) {
      if (failOnError) {
        throw error;
      }
      this.server.logger.error(`Error getting connectors, Error: ${error.message}`, { error });
    }
    return { actionConnectors, settings: this.settings };
  }
}
