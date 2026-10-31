/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { ConversionGoal, ConversionGoalDraft } from '../../../common/conversion_goal';

export const fetchConversionGoals = async (http: HttpStart): Promise<ConversionGoal[]> => {
  const response = await http.get<{ goals: ConversionGoal[] }>('/internal/ux/rum/conversion_goals');
  return response.goals;
};

export const createConversionGoal = async (
  http: HttpStart,
  body: ConversionGoalDraft
): Promise<ConversionGoal> => {
  return http.post<ConversionGoal>('/internal/ux/rum/conversion_goals', {
    body: JSON.stringify(body),
  });
};

export const updateConversionGoal = async (
  http: HttpStart,
  id: string,
  body: ConversionGoalDraft
): Promise<ConversionGoal> => {
  return http.put<ConversionGoal>(`/internal/ux/rum/conversion_goals/${encodeURIComponent(id)}`, {
    body: JSON.stringify(body),
  });
};

export const deleteConversionGoal = async (http: HttpStart, id: string): Promise<void> => {
  await http.delete(`/internal/ux/rum/conversion_goals/${encodeURIComponent(id)}`);
};
