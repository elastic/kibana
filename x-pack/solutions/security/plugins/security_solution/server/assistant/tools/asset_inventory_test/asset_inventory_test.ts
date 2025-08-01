/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tool } from '@langchain/core/tools';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { APP_UI_ID } from '../../../../common';

const DESCRIPTION = 'Call this when question is asked about an asset or an entity';

export const ASSET_INVENTORY_TEST: AssistantTool = {
  id: 'asset_inventory_test',
  name: 'AssetInventoryTest',
  description: DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams) => {
    // Implement your logic to determine if the tool is supported
    return true;
  },
  async getTool(params: AssistantToolParams) {
    return tool(
      async () => {
        return `${JSON.stringify({ high: 10, medium: 100 })}`;
      },
      {
        name: 'AssetInventoryTest',
        description: DESCRIPTION,
        tags: ['asset-inventory, asset-inventory-test'],
      }
    );
  },
};
