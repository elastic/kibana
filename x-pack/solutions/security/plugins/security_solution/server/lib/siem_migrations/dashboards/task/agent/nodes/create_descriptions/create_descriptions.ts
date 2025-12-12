/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { ChatModel } from '../../../../../common/task/util/actions_client_chat';
import type { GraphNode } from '../../types';
import { CREATE_DESCRIPTIONS_PROMPT } from './prompts';

interface GetCreateDescriptionsNodeParams {
  model: ChatModel;
}

interface Output {
  dashboard_description?: string; // the main dashboard description
  panel_descriptions?: Record<string, string>; // panel_id -> description
}

export const getCreateDescriptionsNode = (params: GetCreateDescriptionsNodeParams): GraphNode => {
  return async (state) => {
    const { model } = params;

    const createDescriptions = CREATE_DESCRIPTIONS_PROMPT.pipe(model).pipe(new JsonOutputParser());

    const panels = state.parsed_original_dashboard.panels.map((panel) => ({
      id: panel.id,
      title: panel.title,
      viz_type: panel.viz_type,
    }));

    const response: Output = await createDescriptions.invoke({
      dashboard_title: state.parsed_original_dashboard.title,
      panels_json: JSON.stringify(panels, null, 2),
    });

    return {
      description: response.dashboard_description,
      panel_descriptions: response.panel_descriptions ?? {},
    };
  };
};
