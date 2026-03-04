/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { RuleResponse } from '../../../common/api/detection_engine/model/rule_schema';

const aiRuleSubject = new BehaviorSubject<RuleResponse | null>(null);

export const setAiCreatedRule = (rule: RuleResponse) => aiRuleSubject.next(rule);
export const clearAiCreatedRule = () => aiRuleSubject.next(null);
export const aiCreatedRule$ = aiRuleSubject.asObservable();
