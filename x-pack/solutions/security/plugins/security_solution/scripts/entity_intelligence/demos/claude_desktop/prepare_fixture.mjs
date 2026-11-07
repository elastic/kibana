/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { constants } from 'node:fs';
import { mkdir, open, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CHECKOUT_ROOT, EXPECTED_FIXTURE, FIXTURE_RELATIVE_PATH } from './bridge.mjs';

export const prepareFixture = async ({ checkoutRoot = CHECKOUT_ROOT } = {}) => {
  if (
    typeof checkoutRoot !== 'string' ||
    checkoutRoot.length > 4096 ||
    !isAbsolute(checkoutRoot) ||
    resolve(checkoutRoot) !== checkoutRoot ||
    (await realpath(checkoutRoot)) !== checkoutRoot
  ) {
    throw new Error('Checkout root must be an existing canonical absolute path.');
  }
  const fixturePath = join(checkoutRoot, FIXTURE_RELATIVE_PATH);
  let ancestor = dirname(fixturePath);
  while (true) {
    try {
      if ((await realpath(ancestor)) !== ancestor)
        throw new Error('Fixture directory redirects through a symlink.');
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      ancestor = dirname(ancestor);
    }
  }
  await mkdir(dirname(fixturePath), { recursive: true, mode: 0o700 });
  if ((await realpath(dirname(fixturePath))) !== dirname(fixturePath))
    throw new Error('Fixture path changed.');
  let handle;
  try {
    handle = await open(
      fixturePath,
      constants.O_WRONLY + constants.O_CREAT + constants.O_EXCL + constants.O_NOFOLLOW,
      0o600
    );
    await handle.writeFile(EXPECTED_FIXTURE);
    return { path: fixturePath, created: true };
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = await open(fixturePath, constants.O_RDONLY + constants.O_NOFOLLOW);
    try {
      const info = await existing.stat();
      if (!info.isFile() || info.size !== Buffer.byteLength(EXPECTED_FIXTURE))
        throw new Error('Existing fixture differs; it was not overwritten.');
      const bytes = Buffer.alloc(Buffer.byteLength(EXPECTED_FIXTURE) + 1);
      const { bytesRead } = await existing.read(bytes, 0, bytes.length, 0);
      if (bytes.subarray(0, bytesRead).toString('utf8') !== EXPECTED_FIXTURE)
        throw new Error('Existing fixture differs; it was not overwritten.');
      return { path: fixturePath, created: false };
    } finally {
      await existing.close();
    }
  } finally {
    await handle?.close();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length > 2) throw new Error('Fixture preparation takes no arguments.');
  const result = await prepareFixture();
  process.stdout.write(
    `${result.created ? 'Created' : 'Verified'} approved synthetic fixture: ${result.path}\n`
  );
}
