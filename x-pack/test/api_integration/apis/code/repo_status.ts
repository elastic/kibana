/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  RepoFileStatus,
  StatusReport,
} from '../../../../legacy/plugins/code/common/repo_file_status';

export default function repoStatusTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const log = getService('log');

  const CLONE_API = '/api/code/repo';
  const DELETE_API = '/api/code/repo';
  const REPO_STATUS_API = '/api/code/repo/status';
  const TEST_REPO = 'github.com/elastic/TypeScript-Node-Starter';
  const TEST_REPO_URL = `https://${TEST_REPO}.git`;

  // FLAKY: https://github.com/elastic/kibana/issues/41336
  describe.skip('repo status', () => {
    after(async () => {
      await supertest
        .delete(`${DELETE_API}/${TEST_REPO}`)
        .set('kbn-xsrf', 'xxx')
        .expect(200);
    });

    async function getStatus(revision: string, path: string): Promise<StatusReport> {
      const api = `/api/code/repo/${TEST_REPO}/status/${revision}/${path}`;
      const { body } = await supertest.get(api).expect(200);
      return body as StatusReport;
    }

    it('', async () => {
      {
        // send a clone request
        const response = await supertest
          .post(CLONE_API)
          .set('kbn-xsrf', 'xxx')
          .send({ url: TEST_REPO_URL })
          .expect(200);
        expect(response.body).to.eql({
          uri: TEST_REPO,
          url: TEST_REPO_URL,
          name: 'TypeScript-Node-Starter',
          org: 'elastic',
          protocol: 'https',
        });
      }
      log.info('cloning');
      await retry.tryForTime(60000, async () => {
        const { body } = await supertest.get(`${REPO_STATUS_API}/${TEST_REPO}`).expect(200);
        log.info('clone progress:' + body.gitStatus.progress);
        expect(body.gitStatus).to.have.property('progress', 100);
      });
      log.info('indexing');
      let sawInitializing = false;
      await retry.tryForTime(60000, async () => {
        const { body } = await supertest.get(`${REPO_STATUS_API}/${TEST_REPO}`).expect(200);
        expect(body.indexStatus).to.have.property('progress');
        if (body.indexStatus.progress === 0 && !sawInitializing) {
          const status = await getStatus('master', 'src/app.ts');
          expect(status.langServerStatus).to.be(RepoFileStatus.LANG_SERVER_IS_INITIALIZING);
          sawInitializing = true;
        }
        expect(sawInitializing).to.be(true);
        // indexing
        if (body.progress < 100) {
          const status = getStatus('master', '');
          expect(status).to.have.property('repoStatus', RepoFileStatus.INDEXING);
        }
        expect(body.indexStatus.progress).to.be(100);
        log.info('index done');
        const status = await getStatus('master', '');
        expect(status.repoStatus).not.to.be(RepoFileStatus.INDEXING);
      });
      {
        const status = await getStatus('46971a8454761f1a11d8fde4d96ff8d29bc4e754', '');
        expect(status.repoStatus).to.be(RepoFileStatus.REVISION_NOT_INDEXED);
      }
      {
        const status = await getStatus('master', 'README.md');
        expect(status.fileStatus).to.be(RepoFileStatus.FILE_NOT_SUPPORTED);
      }
    });
  });
}
