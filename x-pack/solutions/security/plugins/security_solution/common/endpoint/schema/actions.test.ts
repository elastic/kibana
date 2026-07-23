/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

import {
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTION_TYPE,
} from '../service/response_actions/constants';
import { createHapiReadableStreamMock } from '../../../server/endpoint/services/actions/mocks';
import type { HapiReadableStream } from '../../../server/types';
import {
  EndpointActionListRequestSchema,
  KillProcessRouteRequestSchema,
  SuspendProcessRouteRequestSchema,
  UploadActionRequestSchema,
  ExecuteActionRequestSchema,
  ScanActionRequestSchema,
  NoParametersRequestSchema,
  RunScriptActionRequestSchema,
  CancelActionRequestSchema,
  EndpointActionGetFileSchema,
  ActionStatusRequestSchema,
  ActionDetailsRequestSchema,
  EndpointActionFileInfoSchema,
  EndpointActionFileDownloadSchema,
} from '../../api/endpoint';
import type { MemoryDumpActionRequestBody } from '../../api/endpoint/actions/response_actions/memory_dump';
import { MemoryDumpActionRequestSchema } from '../../api/endpoint/actions/response_actions/memory_dump';
import { isActionSupportedByAgentType } from '../service/response_actions/is_response_action_supported';

// NOTE: Even though schemas are kept in common/api/endpoint - we keep tests here, because common/api should import from outside
describe('actions schemas', () => {
  describe('Endpoint action list API Schema', () => {
    it('should work without any query keys ', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({}); // no agent_ids provided
      }).not.toThrow();
    });

    it('should work with all required query params', () => {
      expect(() => {
        EndpointActionListRequestSchema.query.validate({
          page: 10,
          pageSize: 100,
          startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
          endDate: new Date().toISOString(), // today
        });
      }).not.toThrow();
    });

    describe('page and pageSize', () => {
      it('should not work with invalid value for `page` query param', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ page: -1 });
        }).toThrow();
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ page: 0 });
        }).toThrow();
      });

      it('should not work with invalid value for `pageSize` query param', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ pageSize: 100001 });
        }).toThrow();
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ pageSize: 0 });
        }).toThrow();
      });
    });

    describe('types', () => {
      it.each(RESPONSE_ACTION_TYPE)('should accept valid %s `types`', (value) => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ types: value });
        }).not.toThrow();
      });

      it.each(RESPONSE_ACTION_TYPE.map((e) => [e]))(
        'should accept valid %s `types` as a list',
        (value) => {
          expect(() => {
            EndpointActionListRequestSchema.query.validate({ types: value });
          }).not.toThrow();
        }
      );

      it('should accept multiple valid `types` as a list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            types: RESPONSE_ACTION_TYPE,
          });
        }).not.toThrow();
      });

      it('should not accept an empty list for `types`', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            types: [],
          });
        }).toThrow();
      });
    });

    describe('agentIds', () => {
      it('should require at least 1 agent ID', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentIds: [] }); // no agent_ids provided
        }).toThrow();
      });

      it('should accept an agent ID if not in an array', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentIds: uuidv4() });
        }).not.toThrow();
      });

      it('should accept an agent ID in an array', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentIds: [uuidv4()] });
        }).not.toThrow();
      });

      it('should accept multiple agent IDs in an array', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            agentIds: [uuidv4(), uuidv4(), uuidv4()],
          });
        }).not.toThrow();
      });

      it('should accept up to 250 agent IDs', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            agentIds: Array(250)
              .fill(1)
              .map(() => uuidv4()),
          });
        }).not.toThrow();
      });

      it('should not accept more than 250 agent IDs', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            agentIds: Array(251)
              .fill(1)
              .map(() => uuidv4()),
          });
        }).toThrow();
      });
    });

    describe('agentTypes', () => {
      it('should accept undefined agentTypes ', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentTypes: undefined });
        }).not.toThrow();
      });

      it.each(RESPONSE_ACTION_AGENT_TYPE)('should accept allowed %s agentTypes ', (agentTypes) => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentTypes });
        }).not.toThrow();
      });

      it.each(RESPONSE_ACTION_AGENT_TYPE)(
        'should accept allowed %s agentTypes in a list',
        (agentTypes) => {
          expect(() => {
            EndpointActionListRequestSchema.query.validate({ agentTypes: [agentTypes] });
          }).not.toThrow();
        }
      );

      it('should accept allowed agentTypes in list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            agentTypes: RESPONSE_ACTION_AGENT_TYPE,
          });
        }).not.toThrow();
      });

      it('should not accept empty agentTypes list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentTypes: [] });
        }).toThrow();
      });

      it('should not accept invalid agentTypes list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentTypes: ['x'] });
        }).toThrow();
      });

      it('should not accept invalid string agentTypes ', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentTypes: 'non-agent' });
        }).toThrow();
      });

      it('should not accept empty string agentTypes ', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentTypes: '' });
        }).toThrow();
      });

      it('should not accept invalid agentTypes in list', () => {
        const excludedAgentType =
          RESPONSE_ACTION_AGENT_TYPE[Math.round(Math.random() * RESPONSE_ACTION_AGENT_TYPE.length)];

        const partialAllowedAgentTypes = RESPONSE_ACTION_AGENT_TYPE.filter(
          (type) => type !== excludedAgentType
        );

        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            agentTypes: [...partialAllowedAgentTypes, 'non-agent'],
          });
        }).toThrow();
      });

      it('should not accept `undefined` agentTypes in list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            agentTypes: [undefined],
          });
        }).toThrow();
      });
    });

    describe('userIds', () => {
      it('should not work without valid userIds', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            page: 10,
            pageSize: 100,
            startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
            endDate: new Date().toISOString(), // today
            userIds: [],
          });
        }).toThrow();
      });

      it('should work with a single userIds query params', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            page: 10,
            pageSize: 100,
            startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
            endDate: new Date().toISOString(), // today
            userIds: ['elastic'],
          });
        }).not.toThrow();
      });

      it('should work with multiple userIds query params', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            page: 10,
            pageSize: 100,
            startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
            endDate: new Date().toISOString(), // today
            userIds: ['elastic', 'fleet'],
          });
        }).not.toThrow();
      });

      it('should accept up to 50 userIds', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            userIds: Array(50)
              .fill(1)
              .map((_, i) => `user-${i}`),
          });
        }).not.toThrow();
      });

      it('should not accept more than 50 userIds', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            userIds: Array(51)
              .fill(1)
              .map((_, i) => `user-${i}`),
          });
        }).toThrow();
      });
    });

    describe('commands', () => {
      it.each(RESPONSE_ACTION_API_COMMANDS_NAMES)(
        'should work with commands query params with %s action',
        (command) => {
          expect(() => {
            EndpointActionListRequestSchema.query.validate({
              page: 10,
              pageSize: 100,
              startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
              endDate: new Date().toISOString(), // today
              commands: command,
            });
          }).not.toThrow();
        }
      );

      it('should work with commands query params with a single action type in a list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            page: 10,
            pageSize: 100,
            startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
            endDate: new Date().toISOString(), // today
            commands: ['isolate'],
          });
        }).not.toThrow();
      });

      it('should not work with commands query params with empty array', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            page: 10,
            pageSize: 100,
            startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
            endDate: new Date().toISOString(), // today
            commands: [],
          });
        }).toThrow();
      });

      it('should work with commands query params with multiple types', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            page: 10,
            pageSize: 100,
            startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
            endDate: new Date().toISOString(), // today
            commands: ['isolate', 'unisolate'],
          });
        }).not.toThrow();
      });

      it('should not accept more than 50 commands', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            commands: Array(51).fill('isolate'),
          });
        }).toThrow();
      });
    });

    describe('statuses', () => {
      it('should work with at least one `statuses` filter in a list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed'],
          });
        }).not.toThrow();
      });

      it.each(['failed', 'pending', 'successful'])('should work alone with %s filter', (status) => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: status,
          });
        }).not.toThrow();
      });

      it('should work with at multiple `statuses` filter', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful'],
          });
        }).not.toThrow();
      });

      it('should not work with empty list for `statuses` filter', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: [],
          });
        }).toThrow();
      });

      it('should not work with more than allowed list for `statuses` filter', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful', 'xyz'],
          });
        }).toThrow();
      });

      it('should not work with any string for `statuses` filter', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['xyz', 'pqr', 'abc'],
          });
        }).toThrow();
      });
    });

    describe('withOutputs', () => {
      it('should not work with only spaces for a string in `withOutputs` list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful'],
            withOutputs: '  ',
          });
        }).toThrow();
      });

      it('should not work with empty string in `withOutputs` list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful'],
            withOutputs: '',
          });
        }).toThrow();
      });

      it('should not work with empty strings in `withOutputs` list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful'],
            withOutputs: ['action-id-1', '  ', 'action-id-2'],
          });
        }).toThrow();
      });

      it('should work with a single action id in `withOutputs` list', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful'],
            withOutputs: 'action-id-1',
          });
        }).not.toThrow();
      });

      it('should work with multiple `withOutputs` filter', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            startDate: 'now-1d', // yesterday
            endDate: 'now', // today
            statuses: ['failed', 'pending', 'successful'],
            withOutputs: ['action-id-1', 'action-id-2'],
          });
        }).not.toThrow();
      });

      it('should accept up to 50 withOutputs action IDs', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            withOutputs: Array(50)
              .fill(1)
              .map(() => uuidv4()),
          });
        }).not.toThrow();
      });

      it('should not accept more than 50 withOutputs action IDs', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({
            withOutputs: Array(51)
              .fill(1)
              .map(() => uuidv4()),
          });
        }).toThrow();
      });
    });
  });

  describe('NoParametersRequestSchema', () => {
    it('should not accept when no endpoint_ids', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({});
      }).toThrow();
    });

    it('should require at least 1 endpoint id', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: [],
        });
      }).toThrow();
    });

    it('should not accept empty endpoint id', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: [''],
        });
      }).toThrow();
    });

    it('should not accept any empty endpoint_ids in the array', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['x', ' ', 'y'],
        });
      }).toThrow();
    });

    it('should accept an Endpoint ID as the only required field', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
        });
      }).not.toThrow();
    });

    it('should accept up to 250 endpoint ids', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: Array(250)
            .fill(1)
            .map(() => uuidv4()),
        });
      }).not.toThrow();
    });

    it('should not accept more than 250 endpoint ids', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: Array(251)
            .fill(1)
            .map(() => uuidv4()),
        });
      }).toThrow();
    });

    it('should accept a comment', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          comment: 'a user comment',
        });
      }).not.toThrow();
    });

    it('should not accept empty alert IDs', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          alert_ids: [' '],
        });
      }).toThrow();
    });

    it('should accept alert IDs', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          alert_ids: ['0000000-000-00'],
        });
      }).not.toThrow();
    });

    it('should not accept more than 50 alert ids', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          alert_ids: Array(51)
            .fill(1)
            .map(() => uuidv4()),
        });
      }).toThrow();
    });

    it('should not accept empty case IDs', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          case_ids: [' '],
        });
      }).toThrow();
    });

    it('should accept case IDs', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          case_ids: ['000000000-000-000'],
        });
      }).not.toThrow();
    });

    it('should not accept more than 50 case ids', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          case_ids: Array(51)
            .fill(1)
            .map(() => uuidv4()),
        });
      }).toThrow();
    });
  });

  describe.each`
    name                                  | killOrSuspendSchema
    ${'KillProcessRouteRequestSchema'}    | ${KillProcessRouteRequestSchema}
    ${'SuspendProcessRouteRequestSchema'} | ${SuspendProcessRouteRequestSchema}
  `('$name', ({ name, killOrSuspendSchema }) => {
    it('should not accept when no endpoint_ids', () => {
      expect(() => {
        killOrSuspendSchema.body.validate({});
      }).toThrow();
    });

    it('should not accept empty endpoint_ids array', () => {
      expect(() => {
        killOrSuspendSchema.body.validate({
          endpoint_ids: [],
        });
      }).toThrow();
    });

    it('should not accept empty string as endpoint id', () => {
      expect(() => {
        killOrSuspendSchema.body.validate({
          endpoint_ids: [' '],
        });
      }).toThrow();
    });

    it('should not accept any empty string in endpoint_ids array', () => {
      expect(() => {
        killOrSuspendSchema.body.validate({
          endpoint_ids: ['x', ' ', 'y'],
        });
      }).toThrow();
    });

    it('should accept pid', () => {
      expect(() => {
        killOrSuspendSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          agent_type: 'endpoint',
          parameters: {
            pid: 1234,
          },
        });
      }).not.toThrow();
    });

    it('should accept entity_id', () => {
      expect(() => {
        killOrSuspendSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          agent_type: 'endpoint',
          parameters: {
            entity_id: 'abc123',
          },
        });
      }).not.toThrow();
    });

    it('should reject pid and entity_id together', () => {
      expect(() => {
        killOrSuspendSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          parameters: {
            pid: 1234,
            entity_id: 'abc123',
          },
        });
      }).toThrow();
    });

    it('should reject if no pid or entity_id', () => {
      expect(() => {
        killOrSuspendSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          comment: 'a user comment',
          parameters: {},
        });
      }).toThrow();
    });

    it('should accept a comment', () => {
      expect(() => {
        killOrSuspendSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          agent_type: 'endpoint',
          comment: 'a user comment',
          parameters: {
            pid: 1234,
          },
        });
      }).not.toThrow();
    });
  });

  describe('KillProcessRouteRequestSchema `kill_descendants` parameter', () => {
    it('should accept `kill_descendants: true` with pid for endpoint agent type', () => {
      expect(() => {
        KillProcessRouteRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          agent_type: 'endpoint',
          parameters: { pid: 1234, kill_descendants: true },
        });
      }).not.toThrow();
    });

    it('should accept `kill_descendants: true` with entity_id for endpoint agent type', () => {
      expect(() => {
        KillProcessRouteRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          agent_type: 'endpoint',
          parameters: { entity_id: 'abc123', kill_descendants: true },
        });
      }).not.toThrow();
    });

    it('should allow request without kill_descendants', () => {
      const result = KillProcessRouteRequestSchema.body.validate({
        endpoint_ids: ['ABC-XYZ-000'],
        agent_type: 'endpoint',
        parameters: { pid: 1234 },
      });

      expect('kill_descendants' in result.parameters).toBe(false);
    });

    it('should reject `kill_descendants` when agent_type is crowdstrike', () => {
      expect(() => {
        KillProcessRouteRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          agent_type: 'crowdstrike',
          parameters: { pid: 1234, kill_descendants: true },
        });
      }).toThrow('[parameters.kill_descendants]: is not valid with agent type of crowdstrike');
    });

    it('should reject `kill_descendants` when agent_type is microsoft_defender_endpoint', () => {
      expect(() => {
        KillProcessRouteRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          agent_type: 'microsoft_defender_endpoint',
          parameters: { pid: 1234, kill_descendants: true },
        });
      }).toThrow(
        '[parameters.kill_descendants]: is not valid with agent type of microsoft_defender_endpoint'
      );
    });

    it('should allow request without kill_descendants for non-endpoint agentType', () => {
      expect(() => {
        KillProcessRouteRequestSchema.body.validate({
          endpoint_ids: ['ABC-XYZ-000'],
          agent_type: 'microsoft_defender_endpoint',
          parameters: { pid: 1234 },
        });
      }).not.toThrow();
    });
  });

  describe('KillProcessRequestSchema for SentinelOne', () => {
    it('should error if agentType is not sentinel_one and process_name parameter is used', () => {
      expect(() => {
        KillProcessRouteRequestSchema.body.validate({
          endpoint_ids: ['abc'],
          parameters: {
            process_name: 'explorer.exe',
          },
        });
      }).toThrow();
    });

    it('should error if agentType is sentinel_one but process_name is not defined', () => {
      expect(() => {
        KillProcessRouteRequestSchema.body.validate({
          endpoint_ids: ['abc'],
          agent_type: 'sentinel_one',
          parameters: { pid: 4 },
        });
      }).toThrow();
    });

    it('should allow use of process_name if agentType is sentinel_one', () => {
      expect(() => {
        KillProcessRouteRequestSchema.body.validate({
          endpoint_ids: ['abc'],
          agent_type: 'sentinel_one',
          parameters: {
            process_name: 'explorer.exe',
          },
        });
      }).not.toThrow();
    });
  });

  describe('ExecuteActionRequestSchema', () => {
    it('should not accept when no endpoint_ids', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({});
      }).toThrow();
    });

    it('should not accept empty endpoint_ids array', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: [],
        });
      }).toThrow();
    });

    it('should not accept empty string as endpoint id', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: [' '],
        });
      }).toThrow();
    });

    it('should not accept any empty string in endpoint_ids array', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['x', ' ', 'y'],
        });
      }).toThrow();
    });

    it('should not accept an empty command with a valid endpoint_id', () => {
      expect(() => {
        NoParametersRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: '  ',
          },
        });
      }).toThrow();
    });

    it('should not accept optional negative integers for timeout with at least one endpoint_id and a command parameter', () => {
      expect(() => {
        ExecuteActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: 'ls -al',
            timeout: -1,
          },
        });
      }).toThrow();
    });

    it('should not accept optional invalid timeout with at least one endpoint_id and a command parameter', () => {
      expect(() => {
        ExecuteActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: 'ls -al',
            timeout: '',
          },
        });
      }).toThrow();
    });

    it('should accept at least one valid endpoint id and a command', () => {
      expect(() => {
        ExecuteActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: 'ls -al',
          },
        });
      }).not.toThrow();
    });

    it('should accept at least one endpoint_id and a command parameter', () => {
      expect(() => {
        ExecuteActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: 'ls -al',
          },
        });
      }).not.toThrow();
    });

    it('should also accept a valid timeout with at least one endpoint_id and a command parameter', () => {
      expect(() => {
        ExecuteActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: 'ls -al',
            timeout: 1000,
          },
        });
      }).not.toThrow();
    });

    it('should also accept an optional comment', () => {
      expect(() => {
        ExecuteActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            command: 'ls -al',
            timeout: 1000,
          },
          comment: 'a user comment',
        });
      }).not.toThrow();
    });
  });

  describe(`UploadActionRequestSchema`, () => {
    let fileStream: HapiReadableStream;

    beforeEach(() => {
      fileStream = createHapiReadableStreamMock();
    });

    it('should not error if `override` parameter is not defined', () => {
      expect(() => {
        UploadActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          file: fileStream,
        });
      }).not.toThrow();
    });

    it('should allow `overwrite` parameter', () => {
      expect(() => {
        UploadActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            overwrite: true,
          },
          file: fileStream,
        });
      }).not.toThrow();
    });

    it('should error if `file` is not defined', () => {
      expect(() => {
        UploadActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            overwrite: true,
          },
        });
      }).toThrow('[file]: expected value of type [Stream] but got [undefined]');
    });

    it('should error if `file` is not a Stream', () => {
      expect(() => {
        UploadActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: {
            overwrite: true,
          },
          file: {},
        });
      }).toThrow('[file]: expected value of type [Stream] but got [Object]');
    });
  });

  describe('ScanActionRequestSchema', () => {
    it('should not accept empty string as path', () => {
      expect(() => {
        ScanActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: { path: ' ' },
        });
      }).toThrowError('path cannot be an empty string');
    });

    it('should not accept when payload does not match', () => {
      expect(() => {
        ScanActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          path: 'some/path',
        });
      }).toThrowError('[parameters.path]: expected value of type [string] but got [undefined]');
    });

    it('should accept path in payload if not empty', () => {
      expect(() => {
        ScanActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint_id'],
          parameters: { path: 'some/path' },
        });
      }).not.toThrow();
    });
  });

  describe('RunScriptActionRequestSchema', () => {
    describe('CrowdStrike agent type', () => {
      const validCrowdStrikeBase = {
        endpoint_ids: ['endpoint_id'],
        agent_type: 'crowdstrike' as const,
      };
      it('should accept valid raw parameter', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validCrowdStrikeBase,
            parameters: {
              raw: 'Get-Process',
            },
          });
        }).not.toThrow();
      });

      it('should accept valid hostPath parameter', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validCrowdStrikeBase,
            parameters: {
              hostPath: '/path/to/script.ps1',
            },
          });
        }).not.toThrow();
      });

      it('should accept valid cloudFile parameter', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validCrowdStrikeBase,
            parameters: {
              cloudFile: 'cloud-script-id',
            },
          });
        }).not.toThrow();
      });

      it('should accept multiple parameters together', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validCrowdStrikeBase,
            parameters: {
              raw: 'Get-Process',
              commandLine: '-ProcessName explorer',
              timeout: 30000,
            },
          });
        }).not.toThrow();
      });

      it('should accept valid timeout parameter', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validCrowdStrikeBase,
            parameters: {
              raw: 'Get-Process',
              timeout: 60000,
            },
          });
        }).not.toThrow();
      });

      it('should accept valid commandLine parameter', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validCrowdStrikeBase,
            parameters: {
              raw: 'Get-Process',
              commandLine: '-ProcessName explorer',
            },
          });
        }).not.toThrow();
      });

      it('should reject empty raw parameter', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validCrowdStrikeBase,
            parameters: {
              raw: '  ',
            },
          });
        }).toThrow('Raw cannot be an empty string');
      });

      it('should reject empty hostPath parameter', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validCrowdStrikeBase,
            parameters: {
              hostPath: '  ',
            },
          });
        }).toThrow('HostPath cannot be an empty string');
      });

      it('should reject empty cloudFile parameter', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validCrowdStrikeBase,
            parameters: {
              cloudFile: '  ',
            },
          });
        }).toThrow('CloudFile cannot be an empty string');
      });

      it('should reject when no required parameters are provided', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validCrowdStrikeBase,
            parameters: {
              commandLine: '-ProcessName explorer',
            },
          });
        }).toThrow('At least one of Raw, HostPath, or CloudFile must be provided');
      });

      it('should reject when parameters object is empty', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validCrowdStrikeBase,
            parameters: {},
          });
        }).toThrow('At least one of Raw, HostPath, or CloudFile must be provided');
      });

      it('should reject negative timeout values', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validCrowdStrikeBase,
            parameters: {
              raw: 'Get-Process',
              timeout: -1,
            },
          });
        }).toThrow();
      });

      it('should reject zero timeout values', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validCrowdStrikeBase,
            parameters: {
              raw: 'Get-Process',
              timeout: 0,
            },
          });
        }).toThrow();
      });
    });

    describe('Microsoft Defender Endpoint agent type', () => {
      const validMdeBase = {
        endpoint_ids: ['endpoint_id'],
        agent_type: 'microsoft_defender_endpoint' as const,
      };

      it('should accept valid scriptName parameter', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validMdeBase,
            parameters: {
              scriptName: 'MyScript.ps1',
            },
          });
        }).not.toThrow();
      });

      it('should accept scriptName with args parameter', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validMdeBase,
            parameters: {
              scriptName: 'MyScript.ps1',
              args: '-Parameter Value',
            },
          });
        }).not.toThrow();
      });

      it('should reject empty scriptName parameter', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validMdeBase,
            parameters: {
              scriptName: '',
            },
          });
        }).toThrow();
      });

      it('should reject when scriptName is missing', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validMdeBase,
            parameters: {
              args: '-Parameter Value',
            },
          });
        }).toThrow('[parameters.scriptName]: expected value of type [string] but got [undefined]');
      });

      it('should reject when parameters object is empty', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validMdeBase,
            parameters: {},
          });
        }).toThrow('[parameters.scriptName]: expected value of type [string] but got [undefined]');
      });

      it('should reject empty args parameter', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            ...validMdeBase,
            parameters: {
              scriptName: 'MyScript.ps1',
              args: '',
            },
          });
        }).toThrow();
      });
    });

    describe('SentinelOne agent type', () => {
      it('should error if `parameters.scriptId` is not provided', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            agent_type: 'sentinel_one',
            endpoint_ids: ['endpoint_id'],
            parameters: {},
          });
        }).toThrow();
      });

      it('should error if script ID value is an empty string', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            agent_type: 'sentinel_one',
            endpoint_ids: ['endpoint_id'],
            parameters: { scriptId: '  ' },
          });
        }).toThrow();
      });

      it('should accept a script id', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            agent_type: 'sentinel_one',
            endpoint_ids: ['endpoint_id'],
            parameters: { scriptId: 'some-id' },
          });
        }).not.toThrow();
      });

      it('should accept scriptInput value', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            agent_type: 'sentinel_one',
            endpoint_ids: ['endpoint_id'],
            parameters: { scriptId: 'some-id', scriptInput: 'some input here' },
          });
        }).not.toThrow();
      });

      it('should error if scriptInput is empty string', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            agent_type: 'sentinel_one',
            endpoint_ids: ['endpoint_id'],
            parameters: { scriptId: 'some-id', scriptInput: '  ' },
          });
        }).toThrow();
      });
    });
  });

  describe.each(
    RESPONSE_ACTION_AGENT_TYPE.filter((agentType) =>
      isActionSupportedByAgentType(agentType, 'cancel', 'manual')
    )
  )('CancelActionRequestSchema for agent type: %s', (agentType) => {
    it('should validate valid cancel request with all base fields', () => {
      expect(() => {
        CancelActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint-123'],
          comment: 'Cancelling action due to change in requirements',
          agent_type: agentType,
          parameters: {
            id: '12345678-1234-5678-9012-123456789012',
          },
        });
      }).not.toThrow();
    });

    it('should validate minimal cancel request with only required fields', () => {
      expect(() => {
        CancelActionRequestSchema.body.validate({
          parameters: {
            id: '12345678-1234-5678-9012-123456789012',
          },
          endpoint_ids: ['endpoint-123'],
          agent_type: agentType,
        });
      }).not.toThrow();
    });

    it('should reject empty id', () => {
      expect(() => {
        CancelActionRequestSchema.body.validate({
          parameters: {
            id: '',
          },
          agent_type: agentType,
          endpoint_ids: ['endpoint-123'],
        });
      }).toThrow();
    });

    it('should reject whitespace-only id', () => {
      expect(() => {
        CancelActionRequestSchema.body.validate({
          parameters: {
            id: '    ',
          },
          endpoint_ids: ['endpoint-123'],
          agent_type: agentType,
        });
      }).toThrow();
    });

    it('should reject missing id', () => {
      expect(() => {
        CancelActionRequestSchema.body.validate({
          endpoint_ids: ['endpoint-123'],
          comment: 'Cancel reason',
          parameters: {},
          agent_type: agentType,
        });
      }).toThrow();
    });

    it('should accept request with optional comment', () => {
      expect(() => {
        CancelActionRequestSchema.body.validate({
          parameters: {
            id: '12345678-1234-5678-9012-123456789012',
          },
          endpoint_ids: ['endpoint-123'],
          agent_type: agentType,
          comment: 'Cancelling due to policy change',
        });
      }).not.toThrow();
    });

    it('should accept request without comment', () => {
      expect(() => {
        CancelActionRequestSchema.body.validate({
          parameters: {
            id: '12345678-1234-5678-9012-123456789012',
          },
          agent_type: agentType,
          endpoint_ids: ['endpoint-123'],
        });
      }).not.toThrow();
    });

    it('should accept request with alert_ids and case_ids', () => {
      expect(() => {
        CancelActionRequestSchema.body.validate({
          parameters: {
            id: '12345678-1234-5678-9012-123456789012',
          },
          endpoint_ids: ['endpoint-123'],
          agent_type: agentType,
          alert_ids: ['alert-456'],
          case_ids: ['case-789'],
          comment: 'Cancel with related alerts and cases',
        });
      }).not.toThrow();
    });

    if (agentType === 'endpoint') {
      it('should accept `--force` argument is present', () => {
        expect(() => {
          CancelActionRequestSchema.body.validate({
            parameters: {
              id: '12345678-1234-5678-9012-123456789012',
              force: true,
            },
            endpoint_ids: ['endpoint-123'],
            agent_type: agentType,
          });
        }).not.toThrow();
      });
    } else {
      it('should reject if `-force` argument is present', () => {
        expect(() => {
          CancelActionRequestSchema.body.validate({
            parameters: {
              id: '12345678-1234-5678-9012-123456789012',
              force: true,
            },
            endpoint_ids: ['endpoint-123'],
            agent_type: agentType,
          });
        }).toThrow();
      });
    }
  });

  describe('MemoryDumpActionRequestSchema', () => {
    let memDumpBody: MemoryDumpActionRequestBody;

    beforeEach(() => {
      memDumpBody = {
        endpoint_ids: ['endpoint-123'],
        parameters: { type: 'kernel' },
      };
    });

    it('should throw if no type parameter is provided', () => {
      // @ts-expect-error missing `type` parameter`
      memDumpBody.parameters = {};

      expect(() => {
        MemoryDumpActionRequestSchema.body.validate(memDumpBody);
      }).toThrow();
    });

    it('should only accept process or kernel as value for type', () => {
      expect(() => MemoryDumpActionRequestSchema.body.validate(memDumpBody)).not.toThrow();

      Object.assign(memDumpBody.parameters, { type: 'process', pid: 1 });

      expect(() => MemoryDumpActionRequestSchema.body.validate(memDumpBody)).not.toThrow();

      // @ts-expect-error invalid type
      memDumpBody.parameters.type = 'foo';
      expect(() => MemoryDumpActionRequestSchema.body.validate(memDumpBody)).toThrow();
    });

    it('should throw if pid or entity id is used with type = kernel', () => {
      memDumpBody.parameters.pid = 1;
      expect(() => MemoryDumpActionRequestSchema.body.validate(memDumpBody)).toThrow();

      delete memDumpBody.parameters.pid;
      memDumpBody.parameters.entity_id = 'some-value';
      expect(() => MemoryDumpActionRequestSchema.body.validate(memDumpBody)).toThrow();
    });

    it('should accept type of process with a pid', () => {
      memDumpBody.parameters.type = 'process';
      memDumpBody.parameters.pid = 1;

      expect(() => MemoryDumpActionRequestSchema.body.validate(memDumpBody)).not.toThrow();
    });

    it('should accept type of process with an entity id', () => {
      memDumpBody.parameters.type = 'process';
      memDumpBody.parameters.entity_id = 'some-value';

      expect(() => MemoryDumpActionRequestSchema.body.validate(memDumpBody)).not.toThrow();
    });

    it('should throw if pid is not a number', () => {
      memDumpBody.parameters.type = 'process';
      // @ts-expect-error pid is not a number
      memDumpBody.parameters.pid = 'one';

      expect(() => MemoryDumpActionRequestSchema.body.validate(memDumpBody)).toThrow();
    });

    it('should throw if entity id is an empty string', () => {
      memDumpBody.parameters.type = 'process';
      memDumpBody.parameters.entity_id = '';

      expect(() => MemoryDumpActionRequestSchema.body.validate(memDumpBody)).toThrow();
    });

    it('should throw if entity id a string padded with only spaces', () => {
      memDumpBody.parameters.type = 'process';
      memDumpBody.parameters.entity_id = '       ';

      expect(() => MemoryDumpActionRequestSchema.body.validate(memDumpBody)).toThrow();
    });

    it('should throw if type is process and no pid or entity ID', () => {
      memDumpBody.parameters.type = 'process';

      expect(() => MemoryDumpActionRequestSchema.body.validate(memDumpBody)).toThrow();
    });

    it('should throw if type is process and both pid and entity id is used', () => {
      memDumpBody.parameters.type = 'process';
      memDumpBody.parameters.pid = 1;
      memDumpBody.parameters.entity_id = 'some-value';

      expect(() => MemoryDumpActionRequestSchema.body.validate(memDumpBody)).toThrow();
    });
  });

  describe('maxLength bounds', () => {
    const charsOfLength = (length: number) => 'a'.repeat(length);

    describe('BaseActionRequestSchema (shared)', () => {
      it('should reject a comment longer than 30000 characters', () => {
        expect(() => {
          NoParametersRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            comment: charsOfLength(30001),
          });
        }).toThrow();
      });

      it('should accept a comment of exactly 30000 characters', () => {
        expect(() => {
          NoParametersRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            comment: charsOfLength(30000),
          });
        }).not.toThrow();
      });

      it('should reject an endpoint id longer than 256 characters', () => {
        expect(() => {
          NoParametersRequestSchema.body.validate({
            endpoint_ids: [charsOfLength(257)],
          });
        }).toThrow();
      });

      it('should accept an endpoint id of exactly 256 characters', () => {
        expect(() => {
          NoParametersRequestSchema.body.validate({
            endpoint_ids: [charsOfLength(256)],
          });
        }).not.toThrow();
      });

      it('should reject an alert id longer than 256 characters', () => {
        expect(() => {
          NoParametersRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            alert_ids: [charsOfLength(257)],
          });
        }).toThrow();
      });

      it('should accept an alert id of exactly 256 characters', () => {
        expect(() => {
          NoParametersRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            alert_ids: [charsOfLength(256)],
          });
        }).not.toThrow();
      });

      it('should reject a case id longer than 256 characters', () => {
        expect(() => {
          NoParametersRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            case_ids: [charsOfLength(257)],
          });
        }).toThrow();
      });

      it('should accept a case id of exactly 256 characters', () => {
        expect(() => {
          NoParametersRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            case_ids: [charsOfLength(256)],
          });
        }).not.toThrow();
      });
    });

    describe('ScanActionRequestSchema', () => {
      it('should reject a path longer than 4096 characters', () => {
        expect(() => {
          ScanActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            parameters: { path: charsOfLength(4097) },
          });
        }).toThrow();
      });

      it('should accept a path of exactly 4096 characters', () => {
        expect(() => {
          ScanActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            parameters: { path: charsOfLength(4096) },
          });
        }).not.toThrow();
      });
    });

    describe('EndpointActionGetFileSchema', () => {
      it('should reject a path longer than 4096 characters', () => {
        expect(() => {
          EndpointActionGetFileSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            parameters: { path: charsOfLength(4097) },
          });
        }).toThrow();
      });

      it('should accept a path of exactly 4096 characters', () => {
        expect(() => {
          EndpointActionGetFileSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            parameters: { path: charsOfLength(4096) },
          });
        }).not.toThrow();
      });
    });

    describe('ExecuteActionRequestSchema', () => {
      it('should reject a command longer than 8192 characters', () => {
        expect(() => {
          ExecuteActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            parameters: { command: charsOfLength(8193) },
          });
        }).toThrow();
      });

      it('should accept a command of exactly 8192 characters', () => {
        expect(() => {
          ExecuteActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            parameters: { command: charsOfLength(8192) },
          });
        }).not.toThrow();
      });
    });

    describe('RunScriptActionRequestSchema', () => {
      it('should reject a CrowdStrike raw script longer than 65536 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'crowdstrike',
            parameters: { raw: charsOfLength(65537) },
          });
        }).toThrow();
      });

      it('should accept a CrowdStrike raw script of exactly 65536 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'crowdstrike',
            parameters: { raw: charsOfLength(65536) },
          });
        }).not.toThrow();
      });

      it('should reject a CrowdStrike hostPath longer than 4096 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'crowdstrike',
            parameters: { hostPath: charsOfLength(4097) },
          });
        }).toThrow();
      });

      it('should accept a CrowdStrike hostPath of exactly 4096 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'crowdstrike',
            parameters: { hostPath: charsOfLength(4096) },
          });
        }).not.toThrow();
      });

      it('should reject a scriptId longer than 256 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'endpoint',
            parameters: { scriptId: charsOfLength(257) },
          });
        }).toThrow();
      });

      it('should accept a scriptId of exactly 256 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'endpoint',
            parameters: { scriptId: charsOfLength(256) },
          });
        }).not.toThrow();
      });

      it('should reject a scriptInput longer than 8192 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'endpoint',
            parameters: { scriptId: 'script-1', scriptInput: charsOfLength(8193) },
          });
        }).toThrow();
      });

      it('should accept a scriptInput of exactly 8192 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'endpoint',
            parameters: { scriptId: 'script-1', scriptInput: charsOfLength(8192) },
          });
        }).not.toThrow();
      });

      it('should reject a CrowdStrike cloudFile longer than 4096 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'crowdstrike',
            parameters: { cloudFile: charsOfLength(4097) },
          });
        }).toThrow();
      });

      it('should accept a CrowdStrike cloudFile of exactly 4096 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'crowdstrike',
            parameters: { cloudFile: charsOfLength(4096) },
          });
        }).not.toThrow();
      });

      it('should reject a CrowdStrike commandLine longer than 8192 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'crowdstrike',
            parameters: { raw: 'Get-Process', commandLine: charsOfLength(8193) },
          });
        }).toThrow();
      });

      it('should accept a CrowdStrike commandLine of exactly 8192 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'crowdstrike',
            parameters: { raw: 'Get-Process', commandLine: charsOfLength(8192) },
          });
        }).not.toThrow();
      });

      it('should reject a microsoft_defender_endpoint scriptName longer than 256 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'microsoft_defender_endpoint',
            parameters: { scriptName: charsOfLength(257) },
          });
        }).toThrow();
      });

      it('should accept a microsoft_defender_endpoint scriptName of exactly 256 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'microsoft_defender_endpoint',
            parameters: { scriptName: charsOfLength(256) },
          });
        }).not.toThrow();
      });

      it('should reject microsoft_defender_endpoint args longer than 8192 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'microsoft_defender_endpoint',
            parameters: { scriptName: 'MyScript.ps1', args: charsOfLength(8193) },
          });
        }).toThrow();
      });

      it('should accept microsoft_defender_endpoint args of exactly 8192 characters', () => {
        expect(() => {
          RunScriptActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'microsoft_defender_endpoint',
            parameters: { scriptName: 'MyScript.ps1', args: charsOfLength(8192) },
          });
        }).not.toThrow();
      });
    });

    describe('KillProcessRouteRequestSchema', () => {
      it('should reject an entity_id longer than 256 characters', () => {
        expect(() => {
          KillProcessRouteRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            parameters: { entity_id: charsOfLength(257) },
          });
        }).toThrow();
      });

      it('should accept an entity_id of exactly 256 characters', () => {
        expect(() => {
          KillProcessRouteRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            parameters: { entity_id: charsOfLength(256) },
          });
        }).not.toThrow();
      });

      it('should reject a process_name longer than 1024 characters', () => {
        expect(() => {
          KillProcessRouteRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'sentinel_one',
            parameters: { process_name: charsOfLength(1025) },
          });
        }).toThrow();
      });

      it('should accept a process_name of exactly 1024 characters', () => {
        expect(() => {
          KillProcessRouteRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            agent_type: 'sentinel_one',
            parameters: { process_name: charsOfLength(1024) },
          });
        }).not.toThrow();
      });
    });

    describe('SuspendProcessRouteRequestSchema', () => {
      it('should reject an entity_id longer than 256 characters', () => {
        expect(() => {
          SuspendProcessRouteRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            parameters: { entity_id: charsOfLength(257) },
          });
        }).toThrow();
      });

      it('should accept an entity_id of exactly 256 characters', () => {
        expect(() => {
          SuspendProcessRouteRequestSchema.body.validate({
            endpoint_ids: ['endpoint_id'],
            parameters: { entity_id: charsOfLength(256) },
          });
        }).not.toThrow();
      });
    });

    describe('MemoryDumpActionRequestSchema', () => {
      it('should reject an entity_id longer than 256 characters', () => {
        expect(() => {
          MemoryDumpActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint-123'],
            parameters: { type: 'process', entity_id: charsOfLength(257) },
          });
        }).toThrow();
      });

      it('should accept an entity_id of exactly 256 characters', () => {
        expect(() => {
          MemoryDumpActionRequestSchema.body.validate({
            endpoint_ids: ['endpoint-123'],
            parameters: { type: 'process', entity_id: charsOfLength(256) },
          });
        }).not.toThrow();
      });
    });

    describe('EndpointActionListRequestSchema', () => {
      it('should reject a startDate longer than 64 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ startDate: charsOfLength(65) });
        }).toThrow();
      });

      it('should accept a startDate of exactly 64 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ startDate: charsOfLength(64) });
        }).not.toThrow();
      });

      it('should reject an endDate longer than 64 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ endDate: charsOfLength(65) });
        }).toThrow();
      });

      it('should accept an endDate of exactly 64 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ endDate: charsOfLength(64) });
        }).not.toThrow();
      });

      it('should reject an agentIds element longer than 256 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentIds: [charsOfLength(257)] });
        }).toThrow();
      });

      it('should accept an agentIds element of exactly 256 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentIds: [charsOfLength(256)] });
        }).not.toThrow();
      });

      it('should reject a userIds element longer than 256 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ userIds: [charsOfLength(257)] });
        }).toThrow();
      });

      it('should accept a userIds element of exactly 256 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ userIds: [charsOfLength(256)] });
        }).not.toThrow();
      });

      it('should reject a withOutputs element longer than 256 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ withOutputs: [charsOfLength(257)] });
        }).toThrow();
      });

      it('should accept a withOutputs element of exactly 256 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ withOutputs: [charsOfLength(256)] });
        }).not.toThrow();
      });

      it('should reject a scalar agentIds value longer than 256 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentIds: charsOfLength(257) });
        }).toThrow();
      });

      it('should accept a scalar agentIds value of exactly 256 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ agentIds: charsOfLength(256) });
        }).not.toThrow();
      });

      it('should reject a scalar userIds value longer than 256 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ userIds: charsOfLength(257) });
        }).toThrow();
      });

      it('should accept a scalar userIds value of exactly 256 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ userIds: charsOfLength(256) });
        }).not.toThrow();
      });

      it('should reject a scalar withOutputs value longer than 256 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ withOutputs: charsOfLength(257) });
        }).toThrow();
      });

      it('should accept a scalar withOutputs value of exactly 256 characters', () => {
        expect(() => {
          EndpointActionListRequestSchema.query.validate({ withOutputs: charsOfLength(256) });
        }).not.toThrow();
      });
    });

    describe('ActionStatusRequestSchema', () => {
      it('should reject an agent_ids element longer than 256 characters', () => {
        expect(() => {
          ActionStatusRequestSchema.query.validate({ agent_ids: [charsOfLength(257)] });
        }).toThrow();
      });

      it('should accept an agent_ids element of exactly 256 characters', () => {
        expect(() => {
          ActionStatusRequestSchema.query.validate({ agent_ids: [charsOfLength(256)] });
        }).not.toThrow();
      });

      it('should reject a scalar agent_ids value longer than 256 characters', () => {
        expect(() => {
          ActionStatusRequestSchema.query.validate({ agent_ids: charsOfLength(257) });
        }).toThrow();
      });

      it('should accept a scalar agent_ids value of exactly 256 characters', () => {
        expect(() => {
          ActionStatusRequestSchema.query.validate({ agent_ids: charsOfLength(256) });
        }).not.toThrow();
      });
    });

    describe('ActionDetailsRequestSchema', () => {
      it('should reject an action_id longer than 256 characters', () => {
        expect(() => {
          ActionDetailsRequestSchema.params.validate({ action_id: charsOfLength(257) });
        }).toThrow();
      });

      it('should accept an action_id of exactly 256 characters', () => {
        expect(() => {
          ActionDetailsRequestSchema.params.validate({ action_id: charsOfLength(256) });
        }).not.toThrow();
      });
    });

    describe('EndpointActionFileInfoSchema', () => {
      it('should reject an action_id longer than 256 characters', () => {
        expect(() => {
          EndpointActionFileInfoSchema.params.validate({
            action_id: charsOfLength(257),
            file_id: 'file_id',
          });
        }).toThrow();
      });

      it('should accept an action_id of exactly 256 characters', () => {
        expect(() => {
          EndpointActionFileInfoSchema.params.validate({
            action_id: charsOfLength(256),
            file_id: 'file_id',
          });
        }).not.toThrow();
      });

      it('should reject a file_id longer than 256 characters', () => {
        expect(() => {
          EndpointActionFileInfoSchema.params.validate({
            action_id: 'action_id',
            file_id: charsOfLength(257),
          });
        }).toThrow();
      });

      it('should accept a file_id of exactly 256 characters', () => {
        expect(() => {
          EndpointActionFileInfoSchema.params.validate({
            action_id: 'action_id',
            file_id: charsOfLength(256),
          });
        }).not.toThrow();
      });
    });

    describe('EndpointActionFileDownloadSchema', () => {
      it('should reject an action_id longer than 256 characters', () => {
        expect(() => {
          EndpointActionFileDownloadSchema.params.validate({
            action_id: charsOfLength(257),
            file_id: 'file_id',
          });
        }).toThrow();
      });

      it('should accept an action_id of exactly 256 characters', () => {
        expect(() => {
          EndpointActionFileDownloadSchema.params.validate({
            action_id: charsOfLength(256),
            file_id: 'file_id',
          });
        }).not.toThrow();
      });

      it('should reject a file_id longer than 256 characters', () => {
        expect(() => {
          EndpointActionFileDownloadSchema.params.validate({
            action_id: 'action_id',
            file_id: charsOfLength(257),
          });
        }).toThrow();
      });

      it('should accept a file_id of exactly 256 characters', () => {
        expect(() => {
          EndpointActionFileDownloadSchema.params.validate({
            action_id: 'action_id',
            file_id: charsOfLength(256),
          });
        }).not.toThrow();
      });
    });
  });
});
