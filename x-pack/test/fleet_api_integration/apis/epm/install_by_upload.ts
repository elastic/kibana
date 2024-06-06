/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import expect from '@kbn/expect';
import { INGEST_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { HTTPError } from 'superagent';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, isDockerRegistryEnabledOrSkipped } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';
import { testUsers } from '../test_users';

/*
 * This test takes long to execute because of the wait time between uploads
 * The upload endpoint is rate limited with a minimum wait time of 10s
 */

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esClient = getService('es');

  const testPkgArchiveTgz = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_0.1.4.tar.gz'
  );
  const testPkgArchiveZip = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_0.1.4.zip'
  );
  const testPkgArchiveInvalidTwoToplevels = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_invalid_two_toplevels_0.1.4.zip'
  );
  const testPkgArchiveInvalidNoManifest = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_invalid_no_manifest_0.1.4.zip'
  );
  const testPkgArchiveInvalidManifestInvalidYaml = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_invalid_manifest_invalid_yaml_0.1.4.zip'
  );
  const testPkgArchiveInvalidManifestMissingField = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_invalid_manifest_missing_field_0.1.4.zip'
  );
  const testPkgArchiveInvalidToplevelMismatch = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache_invalid_toplevel_mismatch_0.1.4.zip'
  );

  const testPkgArchiveZipNewer = path.join(
    path.dirname(__filename),
    '../fixtures/direct_upload_packages/apache-0.1.5.zip'
  );

  const testPkgName = 'apache';
  const testPkgVersion = '0.1.4';
  const testPkgNewVersion = '0.1.5';

  const deletePackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  describe('Installs packages from direct upload', async () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);

    afterEach(async () => {
      if (isDockerRegistryEnabledOrSkipped(providerContext)) {
        // remove the packages just in case it being installed will affect other tests
        await deletePackage(testPkgName, testPkgVersion);
      }
    });

    async function uploadPackage() {
      const buf = fs.readFileSync(testPkgArchiveTgz);
      // wait 10s before uploading again to avoid getting 429
      await new Promise((resolve) => setTimeout(resolve, 10000));
      return await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/gzip')
        .send(buf)
        .expect(200);
    }

    it('should install a tar archive correctly', async function () {
      const res = await uploadPackage();
      expect(res.body.items.length).to.be(30);
    });

    it('should upgrade when uploading a newer zip archive', async () => {
      await uploadPackage();

      await new Promise((resolve) => setTimeout(resolve, 10000));
      const buf = fs.readFileSync(testPkgArchiveZipNewer);
      const res = await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(200);
      expect(res.body.items.length).to.be(30);
      expect(res.body.items.some((item: any) => item.id.includes(testPkgNewVersion)));

      await deletePackage(testPkgName, testPkgNewVersion);
    });

    it('should clean up assets when uninstalling uploaded archive', async () => {
      await uploadPackage();
      await deletePackage(testPkgName, testPkgVersion);

      const epmPackageRes = await esClient.search({
        index: INGEST_SAVED_OBJECT_INDEX,
        size: 0,
        rest_total_hits_as_int: true,
        query: {
          bool: {
            filter: [
              {
                term: {
                  'epm-packages.name': testPkgName,
                },
              },
            ],
          },
        },
      });
      const epmPackageAssetsRes = await esClient.search({
        index: INGEST_SAVED_OBJECT_INDEX,
        size: 0,
        rest_total_hits_as_int: true,
        query: {
          bool: {
            filter: [
              {
                term: {
                  'epm-packages-assets.package_name': testPkgName,
                },
              },
            ],
          },
        },
      });

      expect(epmPackageRes.hits.total).to.equal(0);
      expect(epmPackageAssetsRes.hits.total).to.equal(0);
    });

    it('should get 429 when trying to upload packages too soon', async () => {
      await uploadPackage();

      const buf = fs.readFileSync(testPkgArchiveZipNewer);
      const res = await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(429);
      expect((res.error as HTTPError).text).to.equal(
        '{"statusCode":429,"error":"Too Many Requests","message":"Too many requests. Please wait 10s before uploading again."}'
      );
    });

    it('should install a zip archive correctly and package info should return correctly after validation', async function () {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const buf = fs.readFileSync(testPkgArchiveZip);
      const res = await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(200);
      expect(res.body.items.length).to.be(30);
    });

    it('should throw an error if the archive is zip but content type is gzip', async function () {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const buf = fs.readFileSync(testPkgArchiveZip);
      const res = await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/gzip')
        .send(buf)
        .expect(400);
      expect((res.error as HTTPError).text).to.equal(
        '{"statusCode":400,"error":"Bad Request","message":"Archive seems empty. Assumed content type was application/gzip, check if this matches the archive type."}'
      );
    });

    it('should throw an error if the archive is tar.gz but content type is zip', async function () {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const buf = fs.readFileSync(testPkgArchiveTgz);
      const res = await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(400);
      expect((res.error as HTTPError).text).to.equal(
        '{"statusCode":400,"error":"Bad Request","message":"Error during extraction of package: Error: end of central directory record signature not found. Assumed content type was application/zip, check if this matches the archive type."}'
      );
    });

    it('should throw an error if the archive contains two top-level directories', async function () {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const buf = fs.readFileSync(testPkgArchiveInvalidTwoToplevels);
      const res = await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(400);
      expect((res.error as HTTPError).text).to.equal(
        '{"statusCode":400,"error":"Bad Request","message":"Package contains more than one top-level directory; top-level directory found: apache-0.1.4; filePath: apache-0.1.3/manifest.yml"}'
      );
    });

    it('should throw an error if the archive does not contain a manifest', async function () {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const buf = fs.readFileSync(testPkgArchiveInvalidNoManifest);
      const res = await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(400);
      expect((res.error as HTTPError).text).to.equal(
        '{"statusCode":400,"error":"Bad Request","message":"Manifest file apache-0.1.4/manifest.yml not found in paths."}'
      );
    });

    it('should throw an error if the archive manifest contains invalid YAML', async function () {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const buf = fs.readFileSync(testPkgArchiveInvalidManifestInvalidYaml);
      const res = await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(400);
      expect((res.error as HTTPError).text).to.equal(
        '{"statusCode":400,"error":"Bad Request","message":"Could not parse top-level package manifest at top-level directory apache-0.1.4: YAMLException: bad indentation of a mapping entry at line 2, column 7:\\n      name: apache\\n          ^."}'
      );
    });

    it('should throw an error if the archive manifest misses a mandatory field', async function () {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const buf = fs.readFileSync(testPkgArchiveInvalidManifestMissingField);
      const res = await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(400);
      expect((res.error as HTTPError).text).to.equal(
        '{"statusCode":400,"error":"Bad Request","message":"Invalid top-level package manifest at top-level directory apache-0.1.4 (package name: apache): one or more fields missing of name, version, description, title, format_version, owner."}'
      );
    });

    it('should throw an error if the toplevel directory name does not match the package key', async function () {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const buf = fs.readFileSync(testPkgArchiveInvalidToplevelMismatch);
      const res = await supertest
        .post(`/api/fleet/epm/packages`)
        .set('kbn-xsrf', 'xxxx')
        .type('application/zip')
        .send(buf)
        .expect(400);
      expect((res.error as HTTPError).text).to.equal(
        '{"statusCode":400,"error":"Bad Request","message":"Name thisIsATypo and version 0.1.4 do not match top-level directory apache-0.1.4"}'
      );
    });

    it('should not allow users without all access', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const buf = fs.readFileSync(testPkgArchiveTgz);
      await supertestWithoutAuth
        .post(`/api/fleet/epm/packages`)
        .auth(testUsers.fleet_all_int_read.username, testUsers.fleet_all_int_read.password)
        .set('kbn-xsrf', 'xxxx')
        .type('application/gzip')
        .send(buf)
        .expect(403);
    });

    it('should allow user with all access', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const buf = fs.readFileSync(testPkgArchiveTgz);
      await supertestWithoutAuth
        .post(`/api/fleet/epm/packages`)
        .auth(testUsers.fleet_all_int_all.username, testUsers.fleet_all_int_all.password)
        .set('kbn-xsrf', 'xxxx')
        .type('application/gzip')
        .send(buf)
        .expect(200);
    });
  });
}
