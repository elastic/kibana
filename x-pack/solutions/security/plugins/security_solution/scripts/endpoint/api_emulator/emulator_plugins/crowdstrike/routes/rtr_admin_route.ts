/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildCrowdstrikeRoutePath, TEST_AGENT_ID, TEST_SESSION_ID } from './utils';
import type { ExternalEdrServerEmulatorRouteHandlerMethod } from '../../../external_edr_server_emulator.types';
import type { EmulatorServerRouteDefinition } from '../../../lib/emulator_server.types';

export const rtrAdminCommandRoute = (): EmulatorServerRouteDefinition => {
  return {
    // we use admin command to run run `runscript` and access `cloudFiles` and `custom scripts`
    path: buildCrowdstrikeRoutePath('/real-time-response/combined/batch-admin-command/v1'),
    method: 'POST',
    handler: rtrAdminCommandHandler,
  };
};

// @ts-expect-error - example of error while executing cat command
const rtrAdminCommandExampleError = async () => {
  return {
    meta: {
      query_time: 0.913513625,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    combined: {
      resources: {
        [TEST_AGENT_ID]: {
          session_id: TEST_SESSION_ID,
          task_id: 'xxx',
          complete: true,
          stdout: '',
          stderr: 'cat: test.xt: No such file or directory',
          base_command: 'cat',
          aid: TEST_AGENT_ID,
          errors: [],
          query_time: 0.912058582,
          offline_queued: false,
        },
      },
    },
    errors: [],
  };
};

// @ts-expect-error - example of inactive rtr session error
const rtrAdminCommandInactiveSessionError = async () => {
  return {
    meta: {
      query_time: 0.02078217,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    combined: {
      resources: {
        [TEST_AGENT_ID]: {
          session_id: '',
          complete: false,
          stdout: '',
          stderr: '',
          aid: TEST_AGENT_ID,
          errors: [
            {
              code: 50007,
              message: 'could not get session',
            },
          ],
          query_time: 0,
          offline_queued: false,
        },
      },
    },
    errors: [],
  };
};

// "command_string": "runscript -CloudFile=\"your_script_name\"", - file not existing
// @ts-expect-error - example of wrong cloud file error
const rtrAdminCommandWrongCloudFileExampleError = async () => {
  return {
    meta: {
      query_time: 0.034585269,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    combined: {
      resources: {
        [TEST_AGENT_ID]: {
          session_id: '',
          complete: false,
          stdout: '',
          stderr: '',
          aid: TEST_AGENT_ID,
          errors: [
            {
              code: 40412,
              message: 'The file your_script_name could not be found',
            },
          ],
          query_time: 0,
          offline_queued: false,
        },
      },
    },
    errors: [],
  };
};

// wrong command eg. asd   "command_string": "runscript -Raw=```asd```",
// @ts-expect-error - example of invalid command error
const rtrAdminCommandInvalidCommandError: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  {}
> = async () => {
  return {
    meta: {
      query_time: 1.959748222,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    combined: {
      resources: {
        [TEST_AGENT_ID]: {
          session_id: TEST_SESSION_ID,
          task_id: 'xxx',
          complete: true,
          stdout: '',
          stderr: '/bin/bash: line 1: asd: command not found',
          base_command: 'runscript',
          aid: TEST_AGENT_ID,
          errors: [],
          query_time: 1.95571987,
          offline_queued: false,
        },
      },
    },
    errors: [],
  };
};

const rtrAdminCommandHandler: ExternalEdrServerEmulatorRouteHandlerMethod<{}, {}> = async () => {
  return {
    meta: {
      query_time: 0.945570286,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    combined: {
      resources: {
        [TEST_AGENT_ID]: {
          session_id: TEST_SESSION_ID,
          task_id: 'xxx',
          complete: true,
          stdout:
            'archive\nbackup\nbin\nboot\ndev\netc\nhome\nlib\nlost+found\nmedia\nmnt\nopt\nproc\nroot\nrun\nsbin\nsnap\nsrv\nsys\ntmp\nusr\nvar',
          stderr: '',
          base_command: 'runscript',
          aid: TEST_AGENT_ID,
          errors: [],
          query_time: 0.941080011,
          offline_queued: false,
        },
      },
    },
    errors: [],
  };
};
// runscript -CloudFile='test1' (customScript name) - when script is not accessible - eg. private
// @ts-expect-error - example of private script error
const rtrAdminCommandCustomScriptNotFoundError: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  {}
> = async () => {
  return {
    meta: {
      query_time: 0.01495486,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    combined: {
      resources: {
        [TEST_AGENT_ID]: {
          session_id: '',
          complete: false,
          stdout: '',
          stderr: '',
          aid: TEST_AGENT_ID,
          errors: [
            {
              code: 40412,
              message: 'The file test1 could not be found',
            },
          ],
          query_time: 0,
          offline_queued: false,
        },
      },
    },
    errors: [],
  };
};
// @ts-expect-error - example of error while executing put on a file that already exists on host
const rtrCommandPutFileAlreadyExistError: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  {}
> = async () => {
  return {
    meta: {
      query_time: 7.897133656,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    combined: {
      resources: {
        [TEST_AGENT_ID]: {
          session_id: TEST_SESSION_ID,
          task_id: 'xxx',
          complete: true,
          stdout: '',
          stderr: 'put: Destination already exists.',
          base_command: 'DOWNLOAD_RENAME',
          aid: TEST_AGENT_ID,
          errors: [],
          query_time: 7.8957342520000005,
          offline_queued: false,
        },
      },
    },
    errors: [],
  };
};

// @ts-expect-error - example of success response while executing put on a file
const rtrAdminCommandPutSuccessResponse: ExternalEdrServerEmulatorRouteHandlerMethod<
  {},
  {}
> = async () => {
  return {
    meta: {
      query_time: 5.497466448,
      powered_by: 'empower-api',
      trace_id: 'xxx',
    },
    combined: {
      resources: {
        [TEST_AGENT_ID]: {
          session_id: TEST_SESSION_ID,
          task_id: 'xxx',
          complete: true,
          stdout: '',
          stderr: '',
          base_command: 'DOWNLOAD_RENAME',
          aid: TEST_AGENT_ID,
          errors: [],
          query_time: 5.496508269,
          offline_queued: false,
        },
      },
    },
    errors: [],
  };
};
