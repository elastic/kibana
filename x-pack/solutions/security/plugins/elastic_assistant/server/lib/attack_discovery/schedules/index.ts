/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient } from '@kbn/alerting-plugin/server';
import { CreateRuleData } from '@kbn/alerting-plugin/server/application/rule/methods/create';
import * as z from '@kbn/zod';
import { UpdateRuleData } from '@kbn/alerting-plugin/server/application/rule/methods/update';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { ApiConfig, Replacements } from '@kbn/elastic-assistant-common';
import {
  AIAssistantDataClient,
  AIAssistantDataClientParams,
} from '../../../ai_assistant_data_clients';

export type RuleParams = z.infer<typeof RuleParams>;
export const RuleParams = z.object({
  alertsIndexPattern: z.string(),
  anonymizationFields: z.array(AnonymizationFieldResponse),
  /**
   * LLM API configuration.
   */
  apiConfig: ApiConfig,
  end: z.string().optional(),
  filter: z.object({}).catchall(z.unknown()).optional(),
  langSmithProject: z.string().optional(),
  langSmithApiKey: z.string().optional(),
  model: z.string().optional(),
  replacements: Replacements.optional(),
  size: z.number(),
  start: z.string().optional(),
  subAction: z.enum(['invokeAI', 'invokeStream']),
});
// export type RuleParams = z.infer<typeof RuleParams>;
// export const RuleParams = z.object({
//   author: z.string(),
// });

/**
 * Params for when creating AttackDiscoverySchedulingDataClient in Request Context Factory. Useful if needing to modify
 * configuration after initial plugin start
 */
export interface GetAttackDiscoverySchedulingDataClientParams {
  rulesClient: RulesClient;
}

export interface AttackDiscoverySchedulingDataClientParams extends AIAssistantDataClientParams {
  rulesClient: RulesClient;
}

export class AttackDiscoverySchedulingDataClient extends AIAssistantDataClient {
  constructor(public readonly options: AttackDiscoverySchedulingDataClientParams) {
    super(options);
  }

  public findSchedules = async () => {
    const rules = await this.options.rulesClient.find<RuleParams>({
      options: {
        filter: 'alert.attributes.alertTypeId: assistant.attack_discovery_schedule',
      },
    });
    return rules;
  };

  public getSchedule = async (id: string) => {
    const rule = await this.options.rulesClient.get<RuleParams>({ id });
    return rule;
  };

  public createSchedule = async (ruleToCreate: CreateRuleData<RuleParams>) => {
    const rule = await this.options.rulesClient.create<RuleParams>({ data: ruleToCreate });
    return rule;
  };

  public updateSchedule = async (ruleToUpdate: UpdateRuleData<RuleParams> & { id: string }) => {
    const { id, ...updatePayload } = ruleToUpdate;
    const rule = await this.options.rulesClient.update<RuleParams>({ id, data: updatePayload });
    return rule;
  };

  public deleteSchedule = async (ruleToDelete: { id: string }) => {
    await this.options.rulesClient.delete(ruleToDelete);
  };
}
