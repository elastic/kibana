/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TypeOf } from '@kbn/config-schema';
import { sloHealthParamsSchema } from '@kbn/response-ops-rule-params/slo_health';
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';

export type HealthRuleParams = TypeOf<typeof sloHealthParamsSchema>;
export type ValidationHealthRuleResult = ValidationResult & {
  errors: {
    sloIds: string[];
    staleTime: string[];
    delay: string[];
  };
};

export type Optional<T> = { [P in keyof T]?: T[P] };
