/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { FORENSIC_HOSTS, seedForensicTimeline } from './forensic_data';

interface SeededDoc {
  message: string;
  host: { name: string };
  destination?: { domain?: string };
  process: {
    name: string;
    pid: number;
    command_line?: string;
    parent?: { name: string; pid: number };
  };
}

const seed = async (): Promise<SeededDoc[]> => {
  const bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });
  await seedForensicTimeline({ esClient: { bulk } as unknown as Client }, {
    info: jest.fn(),
  } as unknown as ToolingLog);
  const { operations } = bulk.mock.calls[0][0] as { operations: unknown[] };
  // operations alternate [action, document]
  return operations.filter((_, i) => i % 2 === 1) as SeededDoc[];
};

const docsForHost = (docs: SeededDoc[], host: string) => docs.filter((d) => d.host.name === host);

describe('seedForensicTimeline ambiguous hosts', () => {
  it('seeds net.exe with the `net use` command line and a PID distinct from its parent', async () => {
    const docs = docsForHost(await seed(), FORENSIC_HOSTS.adminWorkstation);
    const share = docs.find((d) => d.destination?.domain === 'FS01');

    expect(share?.process).toEqual(
      expect.objectContaining({
        name: 'net.exe',
        command_line: 'net use \\\\FS01\\backups',
        parent: expect.objectContaining({ name: 'cmd.exe', pid: 6180 }),
      })
    );
    expect(share?.process.pid).not.toBe(6180);
  });

  it.each([FORENSIC_HOSTS.adminWorkstation, FORENSIC_HOSTS.heldOutAdminWorkstation])(
    'does not reuse a PID for a different process on %s',
    async (host) => {
      const docs = docsForHost(await seed(), host);
      const namesByPid = new Map<number, Set<string>>();
      for (const { process } of docs) {
        for (const p of [process, process.parent]) {
          if (p?.pid != null) {
            namesByPid.set(p.pid, (namesByPid.get(p.pid) ?? new Set()).add(p.name));
          }
        }
      }
      for (const names of namesByPid.values()) {
        expect(names.size).toBe(1);
      }
    }
  );

  it.each([FORENSIC_HOSTS.adminWorkstation, FORENSIC_HOSTS.heldOutAdminWorkstation])(
    'keeps benign explanations out of the event messages on %s',
    async (host) => {
      const docs = docsForHost(await seed(), host);
      expect(docs.length).toBeGreaterThan(0);
      for (const { message } of docs) {
        expect(message).not.toMatch(/read-only|audit|routine|scheduled|nightly|no anomaly/i);
      }
    }
  );

  it('seeds the held-out host with a different technique than the vssadmin / share pair', async () => {
    const docs = docsForHost(await seed(), FORENSIC_HOSTS.heldOutAdminWorkstation);
    const names = docs.map((d) => d.process.name);

    expect(names).toContain('PsExec.exe');
    expect(names).not.toContain('vssadmin.exe');
    expect(docs.some((d) => d.destination?.domain === 'FS01')).toBe(false);
  });
});
