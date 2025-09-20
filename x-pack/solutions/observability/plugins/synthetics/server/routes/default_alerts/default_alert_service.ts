/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LockManagerService } from '@kbn/lock-manager';
import { parseDuration } from '@kbn/alerting-plugin/server';
import type { FindActionResult } from '@kbn/actions-plugin/server';
import { type SavedObjectsClientContract } from '@kbn/core/server';
import { isEmpty } from 'lodash';
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
import {
  type DefaultRuleType,
  type SyntheticsDefaultRule,
} from '../../../common/types/default_alerts';

export class DefaultRuleService {
  private settings?: DynamicSettingsAttributes;

  constructor(
    private readonly context: UptimeRequestHandlerContext,
    private readonly server: SyntheticsServerSetup,
    private readonly soClient: SavedObjectsClientContract
  ) {}

  private async getSettings() {
    if (!this.settings) {
      this.settings = await getSyntheticsDynamicSettings(this.soClient);
    }
    return this.settings;
  }

  /**
   * The class requests a lock before persisting default rules.
   * If the lock cannot be acquired, it will throw an error.
   * This is to ensure that no two processes can modify the default rules at the same time.
   * @param cb A callback function that will be executed within the lock.
   * @returns The result of the callback function.
   * @throws LockAcquisitionError if the lock cannot be acquired.
   */
  private acquireLockOrFail<T>(cb: () => Promise<T>, spaceId: string): Promise<T> {
    const lockService = new LockManagerService(this.server.coreSetup, this.server.logger);
    return lockService.withLock(`synthetics-default-rules-lock-${spaceId}`, cb);
  }

  /**
   * Sets up the default rules for the specified space.
   * @param spaceId The ID of the space to set up rules for.
   * @returns A promise that resolves when the rules have been set up.
   * @throws LockAcquisitionError if a lock cannot be acquired to modify the shared resource. Calling code must handle this error.
   */
  public async setupDefaultRules(spaceId: string) {
    this.settings = await this.getSettings();
    if (isEmpty(this.settings?.defaultConnectors)) {
      this.server.logger.debug(
        `Default connectors are not set. Skipping default rule setup for space ${spaceId}.`
      );
      return {
        statusRule: null,
        tlsRule: null,
      };
    }
    return this.acquireLockOrFail(async () => {
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
    }, spaceId);
  }

  private getMinimumRuleInterval() {
    const minimumInterval = this.server.alerting.getConfig().minimumScheduleInterval;
    const minimumIntervalInMs = parseDuration(minimumInterval.value);
    const defaultIntervalInMs = parseDuration('1m');
    return minimumIntervalInMs < defaultIntervalInMs ? '1m' : minimumInterval.value;
  }

  private async setupStatusRule(spaceId: string) {
    const minimumRuleInterval = this.getMinimumRuleInterval();
    if (this.settings?.defaultStatusRuleEnabled === false) {
      return;
    }
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
    return this.createDefaultRuleIfNotExist(
      SYNTHETICS_TLS_RULE,
      `Synthetics internal TLS rule`,
      minimumRuleInterval,
      spaceId
    );
  }

  public async getExistingRule(
    ruleType: DefaultRuleType
  ): Promise<SyntheticsDefaultRule | undefined> {
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
    const { actions = [], systemActions = [], ...rule } = data[0];
    return { ...rule, actions: [...actions, ...systemActions], ruleTypeId: rule.alertTypeId };
  }

  private async createDefaultRuleIfNotExist(
    ruleType: DefaultRuleType,
    name: string,
    interval: string,
    spaceId: string
  ): Promise<SyntheticsDefaultRule | undefined> {
    const actions = await this.getRuleActions(ruleType);
    const rulesClient = await (await this.context.alerting)?.getRulesClient();
    const {
      actions: actionsFromRules = [],
      systemActions = [],
      ...newRule
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
      ...newRule,
      actions: [...actionsFromRules, ...systemActions],
      ruleTypeId: newRule.alertTypeId,
    };
  }

  public async updateDefaultRules(spaceId: string, statusEnabled?: boolean, tlsEnabled?: boolean) {
    return this.acquireLockOrFail(async () => {
      return Promise.all([
        this.updateStatusRule(spaceId, statusEnabled),
        this.updateTlsRule(spaceId, tlsEnabled),
      ]);
    }, spaceId);
  }

  private async updateStatusRule(spaceId: string, enabled?: boolean) {
    if (enabled) {
      const minimumRuleInterval = this.getMinimumRuleInterval();
      return this.upsertDefaultRule(
        SYNTHETICS_STATUS_RULE,
        `Synthetics status internal rule`,
        minimumRuleInterval,
        spaceId
      );
    } else {
      const rulesClient = await (await this.context.alerting)?.getRulesClient();
      await rulesClient.bulkDeleteRules({
        filter: `alert.attributes.alertTypeId:"${SYNTHETICS_STATUS_RULE}" AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
      });
    }
  }

  private async updateTlsRule(spaceId: string, enabled?: boolean) {
    if (enabled) {
      const minimumRuleInterval = this.getMinimumRuleInterval();
      return this.upsertDefaultRule(
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

  private async upsertDefaultRule(
    ruleType: DefaultRuleType,
    name: string,
    interval: string,
    spaceId: string
  ) {
    const rulesClient = await (await this.context.alerting)?.getRulesClient();

    const rule = await this.getExistingRule(ruleType);
    if (rule) {
      const currentIntervalInMs = parseDuration(rule.schedule.interval);
      const minimumIntervalInMs = parseDuration(interval);
      const actions = await this.getRuleActions(ruleType);
      const {
        actions: actionsFromRules = [],
        systemActions = [],
        ...updatedRule
      } = await rulesClient.update({
        id: rule.id,
        data: {
          actions,
          name: rule.name,
          tags: rule.tags,
          schedule: {
            interval: currentIntervalInMs < minimumIntervalInMs ? interval : rule.schedule.interval,
          },
          params: rule.params,
        },
      });
      return {
        ...updatedRule,
        actions: [...actionsFromRules, ...systemActions],
        ruleTypeId: updatedRule.alertTypeId,
      };
    }

    return this.createDefaultRuleIfNotExist(ruleType, name, interval, spaceId);
  }

  private async getRuleActions(ruleType: DefaultRuleType) {
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

  private async getActionConnectors() {
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
