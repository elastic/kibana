/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LockManagerService, LockAcquisitionError } from '@kbn/lock-manager';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { parseDuration } from '@kbn/alerting-plugin/server';
import { FindActionResult } from '@kbn/actions-plugin/server';
import { getSyntheticsDynamicSettings } from '../../saved_objects/synthetics_settings';
import { DynamicSettingsAttributes } from '../../runtime_types/settings';
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

  protected async getSettings() {
    if (!this.settings) {
      this.settings = await getSyntheticsDynamicSettings(this.soClient);
    }
    return this.settings;
  }

  /**
   * The class will use this method to lock before persisting any data.
   * If the lock cannot be acquired, it will throw an error.
   * This is to ensure that no two processes can modify the default alerts at the same time.
   * @param cb A callback function that will be executed within the lock.
   * @returns The result of the callback function.
   * @throws LockAcquisitionError if the lock cannot be acquired.
   */
  private acquireLockOrFail<T>(cb: () => Promise<T>): Promise<T> {
    const lockService = new LockManagerService(this.server.coreSetup, this.server.logger);
    return lockService.withLock(`synthetics-default-alerts-lock`, cb);
  }

  public async setupDefaultAlerts(spaceId: string) {
    console.log('SETUP DEFAULT ALERTS WITH ', spaceId);
    this.settings = await this.getSettings();

    return this.acquireLockOrFail(async () => {
      const [statusRule, tlsRule] = await Promise.allSettled([
        this.setupStatusRule(spaceId),
        this.setupTlsRule(spaceId),
      ]);

      console.log('setup default alerts results', statusRule, tlsRule);

      if (statusRule.status === 'rejected') {
        throw statusRule.reason;
      }
      if (tlsRule.status === 'rejected') {
        throw tlsRule.reason;
      }

      console.log('return results from setupDefaultAlerts', statusRule, tlsRule);
      return {
        statusRule: statusRule.status === 'fulfilled' && statusRule.value ? statusRule.value : null,
        tlsRule: tlsRule.status === 'fulfilled' && tlsRule.value ? tlsRule.value : null,
      };
    });
  }

  protected getMinimumRuleInterval() {
    const minimumInterval = this.server.alerting.getConfig().minimumScheduleInterval;
    const minimumIntervalInMs = parseDuration(minimumInterval.value);
    const defaultIntervalInMs = parseDuration('1m');
    const interval = minimumIntervalInMs < defaultIntervalInMs ? '1m' : minimumInterval.value;
    return interval;
  }

  private async setupStatusRule(spaceId: string) {
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

  private async setupTlsRule(spaceId: string) {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    if (this.settings?.defaultTLSRuleEnabled === false) {
      return;
    }
    const result = await this.createDefaultRuleIfNotExist(
      SYNTHETICS_TLS_RULE,
      `Synthetics internal TLS rule`,
      minimumRuleInterval,
      spaceId
    );
    console.log('TLS RULE SETUP', result);
    return result;
  }

  public async getExistingAlert(ruleType: DefaultRuleType): Promise<SyntheticsDefaultRule | undefined> {
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

  private async createDefaultRuleIfNotExist(
    ruleType: DefaultRuleType,
    name: string,
    interval: string,
    spaceId: string
  ): Promise<SyntheticsDefaultRule | undefined> {
    const actions = await this.getRuleActions(ruleType);
    const rulesClient = await (await this.context.alerting)?.getRulesClient();
    // create the rule with hardcoded ID (we only ever want one of these)
    // the request will fail if the rule already exists
    console.log('CALLING CREATE WHOOOOOOOOOOOOOOOOOOOO');
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
    return {
      ...newAlert,
      actions: [...actionsFromRules, ...systemActions],
      ruleTypeId: newAlert.alertTypeId,
    };
  }

  public async updateDefaultRules(spaceId: string, statusEnabled?: boolean, tlsEnabled?: boolean) {
    return this.acquireLockOrFail(async () => {
      return Promise.all([
        this.updateStatusRule(spaceId, statusEnabled),
        this.updateTlsRule(spaceId, tlsEnabled),
      ]);
    });
  }

  private async updateStatusRule(spaceId: string, enabled?: boolean) {
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

  private async updateTlsRule(spaceId: string, enabled?: boolean) {
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

  private async upsertDefaultAlert(
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

  protected async getRuleActions(ruleType: DefaultRuleType) {
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

  protected async getActionConnectors() {
    const actionsClient = (await this.context.actions)?.getActionsClient();
    if (!this.settings) {
      this.settings = await getSyntheticsDynamicSettings(this.soClient);
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
