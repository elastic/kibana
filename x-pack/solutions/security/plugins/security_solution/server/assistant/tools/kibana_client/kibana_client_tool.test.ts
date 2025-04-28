/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicStructuredTool } from '@langchain/core/tools';
import { KIBANA_CLIENT_TOOL } from './kibana_client_tool';
import { AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';

const assistantToolParams = {
    createLlmInstance: jest.fn().mockReturnValue({ bindTools: jest.fn().mockReturnValue({}) }),
    connectorId: 'fake-connector',
    request: {
        rewrittenUrl: {
            origin: 'http://localhost:5601',
        },
        headers: {
            "kbn-version": "8.0.0",
        }
    },
    assistantContext: {
        getServerBasePath: jest.fn().mockReturnValue('basepath'),
        getRegisteredFeatures: jest.fn().mockReturnValue({
            kibanaClientToolEnabled: true,
        }),
        buildFlavor: 'traditional',
    }
} as unknown as AssistantToolParams;

describe('Kibana client tool', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('DynamicStructuredTool', () => {
        it('gets tool', async () => {
            const tool = (await KIBANA_CLIENT_TOOL.getTool(
                assistantToolParams
            )) as DynamicStructuredTool;

            expect(tool).not.toBeNull();
        });
    });
});
