/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { EsqlTelemetryParams, EsqlTelemetryTracer } from './esql_telemetry_tracer';
import { AnalyticsServiceSetup, Logger } from '@kbn/core/server';

const buildSuccessReportFromLastMessageRun = {
  id: '26dbfd95-b317-452f-b174-d0b2ddc674fd',
  name: 'buildSuccessReportFromLastMessage',
  parent_run_id: '8553799a-7ffa-4cbf-b721-68ba4c5d4356',
  start_time: 1747816088326,
  serialized: {
    lc: 1,
    type: 'constructor',
    id: ['langchain_core', 'runnables', 'RunnableSequence'],
    kwargs: {
      first: {
        lc: 1,
        type: 'not_implemented',
        id: ['langgraph', 'RunnableCallable'],
      },
      middle: [
        {
          lc: 1,
          type: 'not_implemented',
          id: ['langgraph', 'ChannelWrite'],
        },
      ],
      last: {
        lc: 1,
        type: 'not_implemented',
        id: ['langgraph', 'RunnableCallable'],
      },
      omit_sequence_tags: true,
    },
  },
  events: [
    {
      name: 'start',
      time: '2025-05-21T08:28:08.326Z',
    },
    {
      name: 'end',
      time: '2025-05-21T08:28:08.451Z',
    },
  ],
  inputs: {
    input: {
      question:
        'Write an ES|QL query to retrieve suspicious login events. Include fields like username, IP address, timestamp, and event type if possible.',
    },
    messages: [
      {
        lc: 1,
        type: 'constructor',
        id: ['langchain_core', 'messages', 'HumanMessage'],
        kwargs: {
          content:
            'Write an ES|QL query to retrieve suspicious login events. Include fields like username, IP address, timestamp, and event type if possible.',
          additional_kwargs: {},
          response_metadata: {},
          id: '0a54d22a-27f8-42c6-b9cb-c48bbf21a520',
        },
      },
      {
        lc: 1,
        type: 'constructor',
        id: ['langchain_core', 'messages', 'HumanMessage'],
        kwargs: {
          content: 'We have analyzed multiple...',
          additional_kwargs: {},
          response_metadata: {},
          id: 'a321b1d6-4206-416a-b88b-9e291d440ed2',
        },
      },
      {
        lc: 1,
        type: 'constructor',
        id: ['langchain_core', 'messages', 'AIMessage'],
        kwargs: {
          content:
            '```esql\nFROM logs-endpoint.*\n| WHERE MATCH(event.type, "suspicious") OR QSTR("event.type:suspicious")\n| KEEP user.name, source.ip, @timestamp, event.type\n```',
          tool_calls: [],
          invalid_tool_calls: [],
          additional_kwargs: {},
          response_metadata: {},
          id: 'a37252ba-9280-4a90-8211-9a3890c07afb',
        },
      },
    ],
    validateEsqlResults: [
      {
        isValid: true,
        query:
          'FROM logs-endpoint.*\n| WHERE MATCH(event.type, "suspicious") OR QSTR("event.type:suspicious")\n| KEEP user.name, source.ip, @timestamp, event.type',
      },
    ],
    maximumValidationAttempts: 3,
    maximumEsqlGenerationAttempts: 3,
    selectedIndexPattern: 'logs-endpoint.*',
  },
  execution_order: 34,
  child_execution_order: 35,
  run_type: 'chain',
  child_runs: [
    {
      id: '9a083883-7e91-49f8-8a07-d2dd820aab1a',
      name: 'ChannelWrite<...,buildSuccessReportFromLastMessage>',
      parent_run_id: '26dbfd95-b317-452f-b174-d0b2ddc674fd',
      start_time: 1747816088327,
      serialized: {
        lc: 1,
        type: 'not_implemented',
        id: ['langgraph', 'ChannelWrite'],
      },
      events: [
        {
          name: 'start',
          time: '2025-05-21T08:28:08.327Z',
        },
        {
          name: 'end',
          time: '2025-05-21T08:28:08.449Z',
        },
      ],
      inputs: {
        update: {
          messages: [
            '```esql\nFROM logs-endpoint.*\n| WHERE MATCH(event.type, "suspicious") OR QSTR("event.type:suspicious")\n| KEEP user.name, source.ip, @timestamp, event.type\n```\n\nAll queries have been validated.',
          ],
        },
        goto: [],
      },
      execution_order: 35,
      child_execution_order: 35,
      run_type: 'chain',
      child_runs: [],
      extra: {
        metadata: {
          langgraph_step: 4,
          langgraph_node: 'buildSuccessReportFromLastMessage',
          langgraph_triggers: [
            'branch:validateEsqlFromLastMessageNode:condition:buildSuccessReportFromLastMessage',
          ],
          langgraph_path: ['__pregel_pull', 'buildSuccessReportFromLastMessage'],
          langgraph_checkpoint_ns:
            'tools:0da83e7d-f462-55a1-8bd4-71d7aaa1c114|buildSuccessReportFromLastMessage:061a8141-fe72-5e78-9c4d-dc1b00b29bbe',
          __pregel_resuming: false,
          __pregel_task_id: '0da83e7d-f462-55a1-8bd4-71d7aaa1c114',
          checkpoint_ns: 'tools:0da83e7d-f462-55a1-8bd4-71d7aaa1c114',
        },
      },
      tags: ['langsmith:hidden'],
      trace_id: '81c7388a-83c1-421d-8945-36e4709cc8c5',
      dotted_order:
        '20250521T082753224001Z81c7388a-83c1-421d-8945-36e4709cc8c5.20250521T082756132009Z5315721e-818f-4415-91f8-9de83ce690a2.20250521T082756132010Z6967a6c3-ee74-41d5-bd2b-d2fe8ea51647.20250521T082756133011Z15800ae0-2a9c-4c3d-9e8c-25b02e89c6a3.20250521T082756134012Z8553799a-7ffa-4cbf-b721-68ba4c5d4356.20250521T082808326034Z26dbfd95-b317-452f-b174-d0b2ddc674fd.20250521T082808327035Z9a083883-7e91-49f8-8a07-d2dd820aab1a',
      end_time: 1747816088449,
      outputs: {
        update: {
          messages: [
            '```esql\nFROM logs-endpoint.*\n| WHERE MATCH(event.type, "suspicious") OR QSTR("event.type:suspicious")\n| KEEP user.name, source.ip, @timestamp, event.type\n```\n\nAll queries have been validated.',
          ],
        },
        goto: [],
      },
    },
  ],
  extra: {
    metadata: {
      langgraph_step: 4,
      langgraph_node: 'buildSuccessReportFromLastMessage',
      langgraph_triggers: [
        'branch:validateEsqlFromLastMessageNode:condition:buildSuccessReportFromLastMessage',
      ],
      langgraph_path: ['__pregel_pull', 'buildSuccessReportFromLastMessage'],
      langgraph_checkpoint_ns:
        'tools:0da83e7d-f462-55a1-8bd4-71d7aaa1c114|buildSuccessReportFromLastMessage:061a8141-fe72-5e78-9c4d-dc1b00b29bbe',
      __pregel_resuming: false,
      __pregel_task_id: '0da83e7d-f462-55a1-8bd4-71d7aaa1c114',
      checkpoint_ns: 'tools:0da83e7d-f462-55a1-8bd4-71d7aaa1c114',
    },
  },
  tags: ['graph:step:4'],
  trace_id: '81c7388a-83c1-421d-8945-36e4709cc8c5',
  dotted_order:
    '20250521T082753224001Z81c7388a-83c1-421d-8945-36e4709cc8c5.20250521T082756132009Z5315721e-818f-4415-91f8-9de83ce690a2.20250521T082756132010Z6967a6c3-ee74-41d5-bd2b-d2fe8ea51647.20250521T082756133011Z15800ae0-2a9c-4c3d-9e8c-25b02e89c6a3.20250521T082756134012Z8553799a-7ffa-4cbf-b721-68ba4c5d4356.20250521T082808326034Z26dbfd95-b317-452f-b174-d0b2ddc674fd',
  end_time: 1747816088451,
  outputs: {
    update: {
      messages: [
        '```esql\nFROM logs-endpoint.*\n| WHERE MATCH(event.type, "suspicious") OR QSTR("event.type:suspicious")\n| KEEP user.name, source.ip, @timestamp, event.type\n```\n\nAll queries have been validated.',
      ],
    },
    goto: [],
  },
};

const buildUnvalidatedReportFromLastMessageRun = {
  id: '462bd7ef-9380-4edc-87e0-fdc4039c34c6',
  name: 'buildUnvalidatedReportFromLastMessage',
  parent_run_id: '67087c9d-e1d7-44e0-a777-798ed368e4ca',
  start_time: 1747816366123,
  serialized: {
    lc: 1,
    type: 'constructor',
    id: ['langchain_core', 'runnables', 'RunnableSequence'],
    kwargs: {
      first: {
        lc: 1,
        type: 'not_implemented',
        id: ['langgraph', 'RunnableCallable'],
      },
      middle: [
        {
          lc: 1,
          type: 'not_implemented',
          id: ['langgraph', 'ChannelWrite'],
        },
      ],
      last: {
        lc: 1,
        type: 'not_implemented',
        id: ['langgraph', 'RunnableCallable'],
      },
      omit_sequence_tags: true,
    },
  },
  events: [
    {
      name: 'start',
      time: '2025-05-21T08:32:46.123Z',
    },
    {
      name: 'end',
      time: '2025-05-21T08:32:46.249Z',
    },
  ],
  inputs: {
    input: {
      question:
        "Write an ES|QL query to read from the table 'payments' and calculate the average number of payments per user per second.",
    },
    messages: [
      {
        lc: 1,
        type: 'constructor',
        id: ['langchain_core', 'messages', 'HumanMessage'],
        kwargs: {
          content:
            "Write an ES|QL query to read from the table 'payments' and calculate the average number of payments per user per second.",
          additional_kwargs: {},
          response_metadata: {},
          id: '8f24fd52-e0bc-4376-a7d3-52cacd24308e',
        },
      },
      {
        lc: 1,
        type: 'constructor',
        id: ['langchain_core', 'messages', 'AIMessage'],
        kwargs: {
          content:
            '```esql\nFROM payments\n| EVAL duration_in_seconds = DATE_DIFF("seconds", MIN(@timestamp), MAX(@timestamp))\n| STATS total_payments = COUNT(*), unique_users = COUNT_DISTINCT(user_id), duration_in_seconds = MAX(duration_in_seconds)\n| EVAL avg_payments_per_user_per_second = total_payments / (unique_users * duration_in_seconds)\n| KEEP avg_payments_per_user_per_second\n```',
          tool_calls: [],
          invalid_tool_calls: [],
          additional_kwargs: {},
          response_metadata: {},
          id: 'a2c46a10-057d-4e5f-b796-41b967c674f6',
        },
      },
    ],
    validateEsqlResults: [],
    maximumValidationAttempts: 4,
    maximumEsqlGenerationAttempts: 4,
    selectedIndexPattern: null,
  },
  execution_order: 33,
  child_execution_order: 34,
  run_type: 'chain',
  child_runs: [
    {
      id: '52bf7a96-e59a-4324-a4c6-b4b60dbf413c',
      name: 'ChannelWrite<...,buildUnvalidatedReportFromLastMessage>',
      parent_run_id: '462bd7ef-9380-4edc-87e0-fdc4039c34c6',
      start_time: 1747816366124,
      serialized: {
        lc: 1,
        type: 'not_implemented',
        id: ['langgraph', 'ChannelWrite'],
      },
      events: [
        {
          name: 'start',
          time: '2025-05-21T08:32:46.124Z',
        },
        {
          name: 'end',
          time: '2025-05-21T08:32:46.248Z',
        },
      ],
      inputs: {
        update: {
          messages: [
            '```esql\nFROM payments\n| EVAL duration_in_seconds = DATE_DIFF("seconds", MIN(@timestamp), MAX(@timestamp))\n| STATS total_payments = COUNT(*), unique_users = COUNT_DISTINCT(user_id), duration_in_seconds = MAX(duration_in_seconds)\n| EVAL avg_payments_per_user_per_second = total_payments / (unique_users * duration_in_seconds)\n| KEEP avg_payments_per_user_per_second\n\n// This query was not validated.\n```\n\nRepeat the following message in your response:\nThe resulting query was generated as a best effort example, but we are unable to validate it. Please provide the name of the index and fields that should be used in the query.',
          ],
        },
        goto: [],
      },
      execution_order: 34,
      child_execution_order: 34,
      run_type: 'chain',
      child_runs: [],
      extra: {
        metadata: {
          langgraph_step: 3,
          langgraph_node: 'buildUnvalidatedReportFromLastMessage',
          langgraph_triggers: ['nlToEsqlAgentWithoutValidation'],
          langgraph_path: ['__pregel_pull', 'buildUnvalidatedReportFromLastMessage'],
          langgraph_checkpoint_ns:
            'tools:83cef84b-1112-51c5-8aa3-e99b50c15a82|buildUnvalidatedReportFromLastMessage:1c677f2d-8374-512a-8f94-f42ea4fd99cd',
          __pregel_resuming: false,
          __pregel_task_id: '83cef84b-1112-51c5-8aa3-e99b50c15a82',
          checkpoint_ns: 'tools:83cef84b-1112-51c5-8aa3-e99b50c15a82',
        },
      },
      tags: ['langsmith:hidden'],
      trace_id: 'f3ddaf25-6552-4336-bc12-bdea353b1941',
      dotted_order:
        '20250521T083229185001Zf3ddaf25-6552-4336-bc12-bdea353b1941.20250521T083232747009Ze60eba3b-1e62-4f6f-beb1-fbe54645c3d5.20250521T083232748010Z0ded9302-58d2-4543-a875-f69991c69305.20250521T083232748011Z50fc47bc-a6bc-4e75-af4a-73f735bbd0d6.20250521T083232749012Z67087c9d-e1d7-44e0-a777-798ed368e4ca.20250521T083246123033Z462bd7ef-9380-4edc-87e0-fdc4039c34c6.20250521T083246124034Z52bf7a96-e59a-4324-a4c6-b4b60dbf413c',
      end_time: 1747816366248,
      outputs: {
        update: {
          messages: [
            '```esql\nFROM payments\n| EVAL duration_in_seconds = DATE_DIFF("seconds", MIN(@timestamp), MAX(@timestamp))\n| STATS total_payments = COUNT(*), unique_users = COUNT_DISTINCT(user_id), duration_in_seconds = MAX(duration_in_seconds)\n| EVAL avg_payments_per_user_per_second = total_payments / (unique_users * duration_in_seconds)\n| KEEP avg_payments_per_user_per_second\n\n// This query was not validated.\n```\n\nRepeat the following message in your response:\nThe resulting query was generated as a best effort example, but we are unable to validate it. Please provide the name of the index and fields that should be used in the query.',
          ],
        },
        goto: [],
      },
    },
  ],
  extra: {
    metadata: {
      langgraph_step: 3,
      langgraph_node: 'buildUnvalidatedReportFromLastMessage',
      langgraph_triggers: ['nlToEsqlAgentWithoutValidation'],
      langgraph_path: ['__pregel_pull', 'buildUnvalidatedReportFromLastMessage'],
      langgraph_checkpoint_ns:
        'tools:83cef84b-1112-51c5-8aa3-e99b50c15a82|buildUnvalidatedReportFromLastMessage:1c677f2d-8374-512a-8f94-f42ea4fd99cd',
      __pregel_resuming: false,
      __pregel_task_id: '83cef84b-1112-51c5-8aa3-e99b50c15a82',
      checkpoint_ns: 'tools:83cef84b-1112-51c5-8aa3-e99b50c15a82',
    },
  },
  tags: ['graph:step:3'],
  trace_id: 'f3ddaf25-6552-4336-bc12-bdea353b1941',
  dotted_order:
    '20250521T083229185001Zf3ddaf25-6552-4336-bc12-bdea353b1941.20250521T083232747009Ze60eba3b-1e62-4f6f-beb1-fbe54645c3d5.20250521T083232748010Z0ded9302-58d2-4543-a875-f69991c69305.20250521T083232748011Z50fc47bc-a6bc-4e75-af4a-73f735bbd0d6.20250521T083232749012Z67087c9d-e1d7-44e0-a777-798ed368e4ca.20250521T083246123033Z462bd7ef-9380-4edc-87e0-fdc4039c34c6',
  end_time: 1747816366249,
  outputs: {
    update: {
      messages: [
        '```esql\nFROM payments\n| EVAL duration_in_seconds = DATE_DIFF("seconds", MIN(@timestamp), MAX(@timestamp))\n| STATS total_payments = COUNT(*), unique_users = COUNT_DISTINCT(user_id), duration_in_seconds = MAX(duration_in_seconds)\n| EVAL avg_payments_per_user_per_second = total_payments / (unique_users * duration_in_seconds)\n| KEEP avg_payments_per_user_per_second\n\n// This query was not validated.\n```\n\nRepeat the following message in your response:\nThe resulting query was generated as a best effort example, but we are unable to validate it. Please provide the name of the index and fields that should be used in the query.',
      ],
    },
    goto: [],
  },
};

const channelWriteRun = {
  id: '83a0af31-fe85-484d-8068-b266f4ecdbdc',
  name: 'ChannelWrite<...>',
  parent_run_id: 'f52fa664-0bb9-48ec-bc52-2b68b97bcd63',
  start_time: 1747816508159,
  serialized: {
    lc: 1,
    type: 'not_implemented',
    id: ['langgraph', 'ChannelWrite'],
  },
  events: [
    {
      name: 'start',
      time: '2025-05-21T08:35:08.159Z',
    },
    {
      name: 'end',
      time: '2025-05-21T08:35:08.284Z',
    },
  ],
  inputs: {
    responseLanguage: 'English',
    conversationId: 'a3ed58fa-d0a1-4dab-9756-b86fb1c4cf02',
    connectorId: 'gpt4oAzure',
    llmType: 'openai',
    isStream: true,
    isOssModel: false,
    provider: 'openai',
  },
  execution_order: 3,
  child_execution_order: 3,
  run_type: 'chain',
  child_runs: [],
  extra: {
    metadata: {
      langgraph_step: 0,
      langgraph_node: '__start__',
      langgraph_triggers: ['__start__'],
      langgraph_path: ['__pregel_pull', '__start__'],
      langgraph_checkpoint_ns: '__start__:13708e79-e15c-5840-900c-f84c367c4b51',
      __pregel_resuming: false,
      __pregel_task_id: '13708e79-e15c-5840-900c-f84c367c4b51',
      checkpoint_ns: '__start__:13708e79-e15c-5840-900c-f84c367c4b51',
    },
  },
  tags: ['langsmith:hidden'],
  trace_id: '7f7db62d-dcce-4d36-ae4b-29c7f0ac328e',
  dotted_order:
    '20250521T083508086001Z7f7db62d-dcce-4d36-ae4b-29c7f0ac328e.20250521T083508159002Zf52fa664-0bb9-48ec-bc52-2b68b97bcd63.20250521T083508159003Z83a0af31-fe85-484d-8068-b266f4ecdbdc',
  end_time: 1747816508284,
  outputs: {
    responseLanguage: 'English',
    conversationId: 'a3ed58fa-d0a1-4dab-9756-b86fb1c4cf02',
    connectorId: 'gpt4oAzure',
    llmType: 'openai',
    isStream: true,
    isOssModel: false,
    provider: 'openai',
  },
};

describe('esql_telemetry_tracer', () => {
  describe('produces correct telemetry events', () => {
    let logger: Logger;
    let telemetry: AnalyticsServiceSetup;
    let telemetryParams: EsqlTelemetryParams;
    let esqlTelemetryTracer: EsqlTelemetryTracer;

    beforeEach(() => {
      logger = loggerMock.create();
      telemetry = {
        reportEvent: jest.fn(),
      } as unknown as AnalyticsServiceSetup;
      telemetryParams = {
        actionTypeId: '.gen-ai',
        model: 'test_model',
      };
      esqlTelemetryTracer = new EsqlTelemetryTracer(
        {
          telemetry,
          telemetryParams,
        },
        logger
      );
    });

    it('produces correct event if it is a buildSuccessReportFromLastMessage run', async () => {
      await esqlTelemetryTracer.onChainEnd(buildSuccessReportFromLastMessageRun);

      expect(logger.get().debug).toHaveBeenCalledWith(expect.any(Function));
      expect(telemetry.reportEvent).toHaveBeenCalledTimes(1);
      expect(telemetry.reportEvent).toHaveBeenCalledWith('esql_generation_validation_result', {
        actionTypeId: '.gen-ai',
        model: 'test_model',
        validated: true,
      });
    });

    it('produces correct event if it is a buildUnvalidatedReportFromLastMessage run', async () => {
      await esqlTelemetryTracer.onChainEnd(buildUnvalidatedReportFromLastMessageRun);

      expect(logger.get().debug).toHaveBeenCalledWith(expect.any(Function));
      expect(telemetry.reportEvent).toHaveBeenCalledTimes(1);
      expect(telemetry.reportEvent).toHaveBeenCalledWith('esql_generation_validation_result', {
        actionTypeId: '.gen-ai',
        model: 'test_model',
        validated: false,
      });
    });

    it('does not produce event for other nodes', async () => {
      await esqlTelemetryTracer.onChainEnd(channelWriteRun);
      expect(telemetry.reportEvent).toHaveBeenCalledTimes(0);
    });
  });
});
