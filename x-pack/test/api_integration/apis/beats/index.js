/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ES_INDEX_NAME } from './constants';

export default function ({ getService, loadTestFile }) {
  const es = getService('legacyEs');

  describe('beats', () => {
    const cleanup = () =>
      es.indices.delete({
        index: ES_INDEX_NAME,
        ignore: [404],
      });

    beforeEach(cleanup);

    loadTestFile(require.resolve('./create_enrollment_tokens'));
    loadTestFile(require.resolve('./enroll_beat'));
    loadTestFile(require.resolve('./list_beats'));
    loadTestFile(require.resolve('./update_beat'));
    loadTestFile(require.resolve('./set_tag'));
    loadTestFile(require.resolve('./assign_tags_to_beats'));
    loadTestFile(require.resolve('./remove_tags_from_beats'));
    loadTestFile(require.resolve('./get_beat'));
  });
}
