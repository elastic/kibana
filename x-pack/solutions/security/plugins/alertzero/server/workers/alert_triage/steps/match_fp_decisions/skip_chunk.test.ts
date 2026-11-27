/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tagAlerts } from '../ports';
import { tagSkippedChunk } from './skip_chunk';

const SKIP_TAG = 'az:skipped_by_decision:fp-dismissal-0123456789abcdef';
const SKIP_TAGS = ['az:inconclusive', SKIP_TAG];

/** `searches` are the answers to the successive searches, as lists of alert ids. */
const setup = ({
  searches,
  failTagWrite = false,
}: {
  searches: string[][];
  failTagWrite?: boolean;
}) => {
  const answers = [...searches];
  const callKibanaApi = jest.fn().mockImplementation(async ({ path, body }: any) => {
    if (path.endsWith('/signals/search')) {
      const ids = answers.shift() ?? [];
      return { status: 200, headers: {}, body: { hits: { hits: ids.map((_id) => ({ _id })) } } };
    }
    if (failTagWrite && body.tags.tags_to_add.length > 0) throw new Error('tag failed');
    return { status: 200, headers: {}, body: { updated: 1, failures: [] } };
  });
  const api = { callKibanaApi };
  const tagWrites = () =>
    callKibanaApi.mock.calls
      .filter(([{ path }]) => path.endsWith('/signals/tags'))
      .map(([{ body }]) => [body.ids, body.tags.tags_to_add.length > 0 ? 'add' : 'remove']);
  const warn = jest.fn();
  const run = (chunk: string[]) =>
    tagSkippedChunk({
      api,
      write: tagAlerts(api),
      chunk,
      skipTags: SKIP_TAGS,
      skipTag: SKIP_TAG,
      warn,
    });
  return { run, tagWrites, warn };
};

describe('tagSkippedChunk', () => {
  it('tags only the alerts that are open before the write, and returns them', async () => {
    const { run, tagWrites } = setup({ searches: [['a'], ['a']] });

    await expect(run(['a', 'b'])).resolves.toEqual(['a']);

    expect(tagWrites()).toEqual([[['a'], 'add']]);
  });

  it('takes the tags off an alert an analyst moved on during the write, and does not return it', async () => {
    const { run, tagWrites } = setup({ searches: [['a', 'b'], ['a']] });

    await expect(run(['a', 'b'])).resolves.toEqual(['a']);

    expect(tagWrites()).toEqual([
      [['a', 'b'], 'add'],
      [['b'], 'remove'],
    ]);
  });

  it('writes nothing when no alert is open', async () => {
    const { run, tagWrites } = setup({ searches: [[]] });

    await expect(run(['a'])).resolves.toEqual([]);

    expect(tagWrites()).toEqual([]);
  });

  it('takes the tags off the alerts that carry the skip tag when the write fails, then throws', async () => {
    // Open check, then the search for the alerts that carry the skip tag.
    const { run, tagWrites } = setup({ searches: [['a', 'b'], ['a']], failTagWrite: true });

    await expect(run(['a', 'b'])).rejects.toThrow('tag failed');

    // The failed add, then the removal for the alert that carries the tag. `b` is not touched.
    expect(tagWrites()).toEqual([
      [['a', 'b'], 'add'],
      [['a'], 'remove'],
    ]);
  });
});
