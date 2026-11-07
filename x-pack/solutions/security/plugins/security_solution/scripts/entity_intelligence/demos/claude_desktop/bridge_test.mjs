/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  createBridge,
  EXPECTED_FIXTURE,
  FIXTURE_RELATIVE_PATH,
  TOOL_NAME,
  validateAuditPath,
} from './bridge.mjs';
import { prepareFixture } from './prepare_fixture.mjs';

const connected = async (setup = async () => {}) => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'claude-bridge-test-')));
  const fixturePath = join(directory, FIXTURE_RELATIVE_PATH);
  await mkdir(dirname(fixturePath), { recursive: true, mode: 0o700 });
  await writeFile(fixturePath, EXPECTED_FIXTURE, { flag: 'wx', mode: 0o600 });
  const auditPath = join(directory, 'events.jsonl');
  await setup({ directory, fixturePath, auditPath });
  const { server, connectionId } = createBridge({ auditPath, checkoutRoot: directory });
  const client = new Client({ name: 'claude-bridge-test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    connectionId,
    fixturePath,
    audits: async () =>
      (await readFile(auditPath, 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)),
    close: async () => {
      await client.close();
      await server.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
};

test('SDK initialization advertises one bounded read-only tool and executes the approved fixture', async () => {
  const bridge = await connected();
  try {
    const listed = await bridge.client.listTools();
    assert.equal(listed.tools.length, 1);
    assert.equal(listed.tools[0].name, TOOL_NAME);
    assert.equal(JSON.stringify(listed).includes('DEMO-001'), false);
    assert.equal(listed.tools[0].inputSchema.additionalProperties, false);
    assert.equal(listed.tools[0].annotations.readOnlyHint, true);
    const result = await bridge.client.callTool({
      name: TOOL_NAME,
      arguments: { customer: 'Example Customer A' },
    });
    assert.equal(result.isError, false);
    assert.deepEqual(result.structuredContent, {
      customer: 'Example Customer A',
      reference: 'DEMO-001',
      classification: 'confidential-demo',
    });
    const [audit] = await bridge.audits();
    assert.equal(audit.event.outcome, 'success');
    assert.equal(audit.resource.path, bridge.fixturePath);
    assert.equal(audit.resource.accessed, true);
    assert.match(audit.resource.content_sha256, /^[a-f0-9]{64}$/);
    assert.match(audit.input.sha256, /^[a-f0-9]{64}$/);
    assert.match(audit.result.sha256, /^[a-f0-9]{64}$/);
    assert.equal(audit.connection.id, bridge.connectionId);
    assert.equal(audit.connection.is_chat_session, false);
    assert.equal(audit.client.provenance, 'mcp_client_reported');
    assert.equal(audit.client.verified, false);
    assert.equal(audit.human_requester.status, 'not_observed');
    assert.equal(audit.human_requester.authenticated, false);
    assert.equal(audit.local_owner.provenance, 'local_os_account');
    assert.equal(audit.conversation.status, 'not_observed');
    assert.equal(audit.prompt.status, 'not_observed');
    assert.equal(audit.service_account.status, 'not_used');
    assert.equal(audit.evidence.kibana_integration, 'not_connected');
    assert.equal(audit.tool.call_id, audit.event.id);
  } finally {
    await bridge.close();
  }
});

test('path, command and unknown-customer arguments are rejected without retaining their content', async () => {
  const bridge = await connected();
  try {
    const attempts = [
      { customer: 'Example Customer A', path: '/never-read/customer-file.txt' },
      { reference: 'DEMO-001', command: 'never-execute-this' },
      { customer: 'Unapproved Person' },
      { customer: 'Example Customer A', reference: 'DEMO-001' },
      {},
    ];
    for (const args of attempts) {
      const result = await bridge.client.callTool({ name: TOOL_NAME, arguments: args });
      assert.equal(result.isError, true);
    }
    const audits = await bridge.audits();
    assert.equal(audits.length, attempts.length);
    for (const audit of audits) {
      assert.equal(audit.event.outcome, 'failure');
      assert.equal(audit.resource.accessed, false);
      assert.equal(audit.input.omitted, true);
      assert.equal(audit.result.error_code, 'invalid_tool_or_arguments');
    }
    assert.equal(JSON.stringify(audits).includes('/never-read'), false);
    assert.equal(JSON.stringify(audits).includes('never-execute'), false);
    assert.equal(JSON.stringify(audits).includes('Unapproved Person'), false);
  } finally {
    await bridge.close();
  }
});

test('each call has a unique audit ID but only a connection correlation, never a fabricated conversation', async () => {
  const bridge = await connected();
  try {
    await bridge.client.callTool({
      name: TOOL_NAME,
      arguments: { customer: 'Example Customer A' },
    });
    await bridge.client.callTool({
      name: TOOL_NAME,
      arguments: { customer: 'Example Customer A' },
    });
    const [first, second] = await bridge.audits();
    assert.notEqual(first.tool.call_id, second.tool.call_id);
    assert.notEqual(first.tool.request_id, second.tool.request_id);
    assert.equal(first.connection.id, second.connection.id);
    assert.deepEqual(first.input, second.input);
    assert.equal(first.result.sha256, second.result.sha256);
  } finally {
    await bridge.close();
  }
});

test('rejects a symlinked or modified fixture without returning any customer result', async () => {
  for (const change of ['symlink', 'modified', 'oversized']) {
    const bridge = await connected(async ({ directory, fixturePath }) => {
      if (change === 'symlink') {
        const other = join(directory, 'unapproved-record.txt');
        await writeFile(other, EXPECTED_FIXTURE);
        await rm(fixturePath);
        await symlink(other, fixturePath);
      } else {
        await writeFile(
          fixturePath,
          change === 'modified' ? 'unapproved content' : 'a'.repeat(4097)
        );
      }
    });
    try {
      const result = await bridge.client.callTool({
        name: TOOL_NAME,
        arguments: { customer: 'Example Customer A' },
      });
      assert.equal(result.isError, true);
      assert.equal(result.structuredContent, undefined);
      const [audit] = await bridge.audits();
      assert.equal(audit.resource.accessed, false);
      assert.equal(audit.result.error_code, 'approved_fixture_unavailable');
      assert.equal(audit.resource.content_sha256, undefined);
      assert.equal(JSON.stringify(audit).includes('unapproved content'), false);
    } finally {
      await bridge.close();
    }
  }
});

test('validates the audit configuration before handling protocol traffic', () => {
  for (const path of [
    'relative.jsonl',
    '/tmp/log/../events.jsonl',
    '/tmp/events.txt',
    '/tmp/a\n.jsonl',
    `/${'a'.repeat(4097)}.jsonl`,
  ]) {
    assert.throws(() => validateAuditPath(path), /Audit path/);
  }
  assert.equal(
    validateAuditPath('/private/tmp/approved/events.jsonl'),
    '/private/tmp/approved/events.jsonl'
  );
  assert.throws(() => createBridge({ checkoutRoot: '../another-root' }), /Checkout root/);
});

test('does not append to an existing nonprivate audit file or through symlink redirection', async () => {
  for (const change of ['nonprivate', 'symlink']) {
    const bridge = await connected(async ({ directory, auditPath }) => {
      if (change === 'nonprivate') {
        await writeFile(auditPath, '', { mode: 0o600 });
        await chmod(auditPath, 0o644);
      } else {
        const other = join(directory, 'other-audit.jsonl');
        await writeFile(other, '', { mode: 0o600 });
        await symlink(other, auditPath);
      }
    });
    try {
      await assert.rejects(() =>
        bridge.client.callTool({ name: TOOL_NAME, arguments: { customer: 'Example Customer A' } })
      );
      await assert.rejects(() => bridge.audits());
    } finally {
      await bridge.close();
    }
  }
});

test('refuses an audit append that would cross the 16 MiB cap', async () => {
  const bridge = await connected(async ({ auditPath }) => {
    await writeFile(auditPath, Buffer.alloc(16 * 1024 * 1024 - 1), { mode: 0o600 });
  });
  try {
    await assert.rejects(() =>
      bridge.client.callTool({ name: TOOL_NAME, arguments: { customer: 'Example Customer A' } })
    );
  } finally {
    await bridge.close();
  }
});

test('fixture preparation creates only the approved record and never overwrites other content', async () => {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'claude-bridge-seed-test-')));
  try {
    const first = await prepareFixture({ checkoutRoot: directory });
    assert.equal(first.created, true);
    assert.equal(await readFile(first.path, 'utf8'), EXPECTED_FIXTURE);
    assert.equal((await prepareFixture({ checkoutRoot: directory })).created, false);
    await writeFile(first.path, 'existing unrelated content');
    await assert.rejects(() => prepareFixture({ checkoutRoot: directory }), /not overwritten/);
    assert.equal(await readFile(first.path, 'utf8'), 'existing unrelated content');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
