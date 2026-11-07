/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open, realpath } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export const CHECKOUT_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../../../../..'
);
export const FIXTURE_RELATIVE_PATH =
  'data/entity_intelligence/ei-demo-sensitive/customer_records.txt';
export const FIXTURE_PATH = join(CHECKOUT_ROOT, FIXTURE_RELATIVE_PATH);
export const TOOL_NAME = 'read_customer_reference';
export const DEFAULT_AUDIT_PATH = join(
  CHECKOUT_ROOT,
  'data',
  'entity_intelligence',
  'claude_desktop_bridge',
  'events.jsonl'
);
export const EXPECTED_FIXTURE =
  'Entity Intelligence demonstration fixture — synthetic records only.\nclassification: confidential-demo\ncustomer: Example Customer A\nreference: DEMO-001\nThis file contains no credentials or real customer data.\n';
const FIXTURE_RESULT = Object.freeze({
  customer: 'Example Customer A',
  reference: 'DEMO-001',
  classification: 'confidential-demo',
});
const hash = (value) => createHash('sha256').update(value).digest('hex');
const boundedLabel = (value) =>
  typeof value === 'string' && /^[A-Za-z0-9 ._:+/-]{1,100}$/.test(value) ? value : '[unavailable]';
const localAccount = () => {
  const account = userInfo();
  return { id: `uid:${account.uid}`, name: account.username, provenance: 'local_os_account' };
};
const safeRequestId = (value) => {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  if (typeof value === 'string' && /^[A-Za-z0-9._:-]{1,100}$/.test(value)) return value;
  return `sha256:${hash(String(value))}`;
};
const validArguments = (args) => {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return false;
  const keys = Object.keys(args);
  return keys.length === 1 && keys[0] === 'customer' && args.customer === FIXTURE_RESULT.customer;
};

const readFixture = async (fixturePath) => {
  if ((await realpath(fixturePath)) !== fixturePath) throw new Error('Fixture path changed.');
  const handle = await open(fixturePath, constants.O_RDONLY + constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size > 4096) throw new Error('Fixture is unavailable.');
    const bytes = Buffer.alloc(4097);
    const { bytesRead } = await handle.read(bytes, 0, bytes.length, 0);
    if (bytesRead > 4096) throw new Error('Fixture is unavailable.');
    const content = bytes.subarray(0, bytesRead).toString('utf8');
    if (content !== EXPECTED_FIXTURE)
      throw new Error('Fixture does not match the approved synthetic content.');
    return { value: { ...FIXTURE_RESULT }, sourceHash: hash(content) };
  } finally {
    await handle.close();
  }
};

export const validateAuditPath = (path) => {
  if (
    typeof path !== 'string' ||
    path.length > 4096 ||
    !isAbsolute(path) ||
    resolve(path) !== path ||
    /[\u0000-\u001f\u007f]/.test(path) ||
    !path.endsWith('.jsonl')
  ) {
    throw new Error('Audit path must be a bounded absolute normalized .jsonl path.');
  }
  return path;
};
const ensureAuditParent = async (path) => {
  let ancestor = dirname(path);
  while (true) {
    try {
      if ((await realpath(ancestor)) !== ancestor)
        throw new Error('Audit path redirects through a symlink.');
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = dirname(ancestor);
      if (parent === ancestor) throw new Error('Audit directory is unavailable.');
      ancestor = parent;
    }
  }
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  if ((await realpath(dirname(path))) !== dirname(path)) throw new Error('Audit path changed.');
};
const appendAudit = async (path, record) => {
  await ensureAuditParent(path);
  const handle = await open(
    path,
    constants.O_WRONLY + constants.O_CREAT + constants.O_APPEND + constants.O_NOFOLLOW,
    0o600
  );
  try {
    const info = await handle.stat();
    const line = `${JSON.stringify(record)}\n`;
    if (
      !info.isFile() ||
      info.nlink !== 1 ||
      info.uid !== userInfo().uid ||
      info.mode % 0o100 !== 0 ||
      info.size + Buffer.byteLength(line) > 16 * 1024 * 1024
    )
      throw new Error('Audit log unavailable or full.');
    await handle.writeFile(line);
  } finally {
    await handle.close();
  }
};

// The lower-level SDK handler lets us audit rejected arguments without ever executing them.
export const createBridge = ({
  auditPath = DEFAULT_AUDIT_PATH,
  checkoutRoot = CHECKOUT_ROOT,
} = {}) => {
  validateAuditPath(auditPath);
  if (
    typeof checkoutRoot !== 'string' ||
    checkoutRoot.length > 4096 ||
    !isAbsolute(checkoutRoot) ||
    resolve(checkoutRoot) !== checkoutRoot ||
    /[\u0000-\u001f\u007f]/.test(checkoutRoot)
  ) {
    throw new Error('Checkout root must be a bounded absolute normalized path.');
  }
  // The root override is for offline protocol tests; the stdio entry point never accepts it.
  const fixturePath = join(checkoutRoot, FIXTURE_RELATIVE_PATH);
  let auditTail = Promise.resolve();
  const connectionId = randomUUID();
  const account = localAccount();
  const server = new Server(
    { name: 'entity-intelligence-customer-records', version: '0.1.0' },
    {
      capabilities: { tools: {} },
      instructions:
        'Look up the customer reference using read_customer_reference. The available customer is Example Customer A. Use the tool to retrieve their current reference.',
    }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: TOOL_NAME,
        title: 'Read customer reference',
        description:
          'Retrieve the customer and reference for an available customer record. Select by customer name.',
        inputSchema: {
          type: 'object',
          properties: {
            customer: { type: 'string', maxLength: 80, enum: ['Example Customer A'] },
          },
          required: ['customer'],
          additionalProperties: false,
        },
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
    ],
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const started = new Date().toISOString();
    const callId = randomUUID();
    const reportedClient = server.getClientVersion();
    const nameMatches = request.params.name === TOOL_NAME;
    const validInput = validArguments(request.params.arguments);
    let outcome = 'failure';
    let result;
    let sourceHash;
    let errorCode;
    if (!nameMatches || !validInput) {
      errorCode = 'invalid_tool_or_arguments';
    } else {
      try {
        const fixture = await readFixture(fixturePath);
        result = fixture.value;
        sourceHash = fixture.sourceHash;
        outcome = 'success';
      } catch {
        errorCode = 'approved_fixture_unavailable';
      }
    }
    const response =
      outcome === 'success'
        ? {
            content: [{ type: 'text', text: JSON.stringify(result) }],
            structuredContent: result,
            isError: false,
          }
        : {
            content: [
              {
                type: 'text',
                text:
                  errorCode === 'invalid_tool_or_arguments'
                    ? 'Choose the available customer (Example Customer A). Other tools, paths, commands and arguments are not supported.'
                    : 'The approved customer reference is unavailable.',
              },
            ],
            isError: true,
          };
    const record = {
      schema_version: 1,
      '@timestamp': started,
      event: {
        id: callId,
        dataset: 'claude_desktop.mcp_tool',
        action: 'tool_call',
        outcome,
        completed_at: new Date().toISOString(),
      },
      connection: { id: connectionId, kind: 'mcp_stdio_connection', is_chat_session: false },
      client: {
        name: boundedLabel(reportedClient?.name),
        version: boundedLabel(reportedClient?.version),
        provenance: 'mcp_client_reported',
        verified: false,
      },
      local_owner: account,
      executing_principal: account,
      human_requester: { status: 'not_observed', authenticated: false },
      service_account: { status: 'not_used' },
      conversation: { status: 'not_observed' },
      prompt: { status: 'not_observed' },
      tool: {
        name: nameMatches ? TOOL_NAME : '[unsupported tool]',
        call_id: callId,
        request_id: safeRequestId(extra.requestId),
      },
      input: {
        ...(nameMatches && validInput
          ? { value: request.params.arguments }
          : { omitted: true, reason: 'unapproved_fields_not_retained' }),
        sha256: hash(JSON.stringify(request.params.arguments ?? null)),
      },
      resource: {
        path: fixturePath,
        classification: 'confidential-demo',
        content_sha256: sourceHash,
        accessed: outcome === 'success',
      },
      result: {
        ...(result ? { value: result } : {}),
        sha256: hash(JSON.stringify(response)),
        is_error: response.isError,
        error_code: errorCode,
      },
      evidence: {
        source: 'local_mcp_tool_boundary',
        policy_evaluation: 'not_connected',
        kibana_integration: 'not_connected',
        assistant_reasoning_captured: false,
      },
    };
    const pending = auditTail.then(() => appendAudit(auditPath, record));
    auditTail = pending.catch(() => {});
    await pending;
    return response;
  });
  return { server, connectionId };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length > 2) throw new Error('The bridge takes no command-line arguments.');
  const { server } = createBridge({
    auditPath: process.env.EI_CLAUDE_AUDIT_PATH ?? DEFAULT_AUDIT_PATH,
  });
  server.onerror = () =>
    process.stderr.write('Customer reference bridge protocol error; raw request omitted.\n');
  await server.connect(new StdioServerTransport());
  const close = async () => {
    await server.close();
    process.stdin.pause();
    process.exitCode = 0;
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}
