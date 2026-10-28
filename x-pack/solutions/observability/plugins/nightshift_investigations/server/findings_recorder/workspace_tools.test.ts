/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SandboxSession } from '@kbn/sandbox-plugin/server';
import { createOutputRedactor } from '../tools/sandbox_bash/output_redactor';
import { createRecorderWorkspace, resolveWorkspacePath } from './workspace_tools';

describe('resolveWorkspacePath', () => {
  it('accepts a path under the workspace and normalizes it', () => {
    expect(resolveWorkspacePath('/workspace/.recorder/results/001-x.txt')).toEqual({
      ok: true,
      path: '/workspace/.recorder/results/001-x.txt',
    });
    expect(resolveWorkspacePath('/workspace/a/../b.txt')).toEqual({
      ok: true,
      path: '/workspace/b.txt',
    });
  });

  it.each([
    ['outside the workspace', '/etc/passwd'],
    ['climbing out with ..', '/workspace/../etc/passwd'],
    ['a relative path', 'workspace/a.txt'],
    ['a sibling that shares the prefix', '/workspace-other/a.txt'],
    ['shell characters', "/workspace/a'; rm -rf /; '"],
    ['an empty path', ''],
  ])('rejects %s', (_name, path) => {
    expect(resolveWorkspacePath(path).ok).toBe(false);
  });
});

describe('createRecorderWorkspace', () => {
  const setup = ({ files = {} as Record<string, string>, redact = [] as string[] } = {}) => {
    const session = {
      statFiles: jest.fn(async (paths: string[]) =>
        paths.map((path) => ({
          path,
          exists: path in files || path === '/workspace/dir',
          is_dir: path === '/workspace/dir',
          size: path in files ? Buffer.byteLength(files[path]) : 0,
          modified_time_sec: 0,
        }))
      ),
      readFiles: jest.fn(async (requests: Array<{ path: string; maxReadBytes?: number }>) =>
        requests.map(({ path, maxReadBytes }) => ({
          path,
          success: path in files,
          content: Buffer.from(files[path] ?? '').subarray(0, maxReadBytes),
        }))
      ),
      writeFiles: jest.fn(async (written: unknown[]) =>
        written.map(() => ({ bytes_written: 1, success: true }))
      ),
      mkdirs: jest.fn().mockResolvedValue([true]),
    };
    const workspace = createRecorderWorkspace({
      session: session as unknown as SandboxSession,
      redactor: createOutputRedactor(redact),
    });
    return { session, workspace };
  };

  it('reads a file', async () => {
    const { workspace } = setup({ files: { '/workspace/a.txt': 'hello' } });
    await expect(workspace.readFile({ path: '/workspace/a.txt' })).resolves.toBe('hello');
  });

  it('reads a window of a long file and says where to read on', async () => {
    const { workspace, session } = setup({ files: { '/workspace/a.txt': '0123456789' } });

    const text = await workspace.readFile({ path: '/workspace/a.txt', offset: 2, length: 3 });

    expect(text).toContain('234');
    expect(text).toContain('read on with offset 5');
    // The whole file is read, and then paged, so that redaction sees all of it.
    expect(session.readFiles).toHaveBeenCalledWith([
      { path: '/workspace/a.txt', maxReadBytes: 10 },
    ]);
  });

  it('does not show a secret that a page boundary cuts in two', async () => {
    const secret = 'sk-very-secret-value';
    const { workspace } = setup({
      files: { '/workspace/a.txt': `before ${secret} after, and ${secret} again` },
      redact: [secret],
    });

    // Page through the whole file in small windows, at offsets that would land inside the secret
    // if the pages were redacted one by one.
    let shown = '';
    for (let offset = 0; offset < 200; offset += 5) {
      shown += await workspace.readFile({ path: '/workspace/a.txt', offset, length: 5 });
    }

    const redactedText = shown.replace(/\n\[bytes[^\]]*\]/g, '');
    expect(redactedText).toBe('before [REDACTED] after, and [REDACTED] again');
    expect(shown).not.toMatch(/sk-very|secret-value|-secret|ret-val|alue/);
  });

  it('shows less of a file cut at the read limit, so a secret cut by it is not shown in part', async () => {
    const { workspace } = setup({ files: { '/workspace/big.txt': 'x'.repeat(2_000_100) } });

    const text = await workspace.readFile({
      path: '/workspace/big.txt',
      offset: 1_998_000,
      length: 5_000,
    });

    expect(text).toContain('the file is longer than can be read');
    // 2,000,000 read, less the 1,024-byte margin.
    expect(text).toContain('bytes 1998000-1998976');
  });

  it('returns at most the maximum for one read, whatever length is asked for', async () => {
    const { workspace } = setup({ files: { '/workspace/a.txt': 'x'.repeat(100_000) } });

    const text = await workspace.readFile({ path: '/workspace/a.txt', length: 1_000_000 });

    expect(text.startsWith('x'.repeat(32_000))).toBe(true);
    expect(text).not.toContain('x'.repeat(32_001));
    expect(text).toContain('read on with offset 32000');
  });

  it('redacts secrets from what it returns', async () => {
    const { workspace } = setup({
      files: { '/workspace/a.txt': 'key=sk-very-secret-value ok' },
      redact: ['sk-very-secret-value'],
    });
    const text = await workspace.readFile({ path: '/workspace/a.txt' });
    expect(text).not.toContain('sk-very-secret-value');
    expect(text).toContain('[REDACTED]');
  });

  it('explains a missing file or a directory instead of throwing', async () => {
    const { workspace } = setup();
    await expect(workspace.readFile({ path: '/workspace/none.txt' })).resolves.toContain(
      'does not exist'
    );
    await expect(workspace.readFile({ path: '/workspace/dir' })).resolves.toContain(
      'is a directory'
    );
  });

  it('does not touch the sandbox for a path outside the workspace', async () => {
    const { workspace, session } = setup();
    await expect(workspace.readFile({ path: '/etc/passwd' })).resolves.toContain(
      'Only paths under'
    );
    expect(session.statFiles).not.toHaveBeenCalled();
    expect(session.readFiles).not.toHaveBeenCalled();
  });

  it('writes the results into the recorder directory', async () => {
    const { workspace, session } = setup();

    await workspace.writeResults([
      { path: '/workspace/.recorder/results/001-x.txt', content: 'abc' },
    ]);

    expect(session.mkdirs).toHaveBeenCalledWith(['/workspace/.recorder/results']);
    expect(session.writeFiles).toHaveBeenCalledWith([
      { path: '/workspace/.recorder/results/001-x.txt', content: Buffer.from('abc') },
    ]);
  });

  it('fails when a file is reported as not written, even though the call resolved', async () => {
    const { workspace, session } = setup();
    session.writeFiles.mockResolvedValue([{ bytes_written: 0, success: false }]);

    await expect(
      workspace.writeResults([{ path: '/workspace/.recorder/results/001-x.txt', content: 'abc' }])
    ).rejects.toThrow('Could not write /workspace/.recorder/results/001-x.txt');
  });

  it('fails when the results directory could not be created', async () => {
    const { workspace, session } = setup();
    session.mkdirs.mockResolvedValue([false]);

    await expect(
      workspace.writeResults([{ path: '/workspace/.recorder/results/001-x.txt', content: 'abc' }])
    ).rejects.toThrow('Could not create');
    expect(session.writeFiles).not.toHaveBeenCalled();
  });
});
