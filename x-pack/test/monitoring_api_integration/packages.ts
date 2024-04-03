/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { createReadStream } from 'fs';
import type SuperTest from 'supertest';

type SupportedPackage = 'beat' | 'elasticsearch' | 'enterprisesearch' | 'logstash' | 'kibana';

const PACKAGES = [
  { name: 'beat', version: '0.1.3' },
  { name: 'elasticsearch', version: '1.4.1' },
  { name: 'enterprisesearch', version: '1.0.0' },
  { name: 'logstash', version: '2.2.2-preview1' },
  { name: 'kibana', version: '2.3.0-preview1' },
];

export const getPackagesArgs = (): string[] => {
  return PACKAGES.flatMap((pkg, i) => {
    return [
      `--xpack.fleet.packages.${i}.name=${pkg.name}`,
      `--xpack.fleet.packages.${i}.version=${pkg.version}`,
    ];
  });
};

export const bundledPackagesLocation = path.join(path.dirname(__filename), '/fixtures/packages');

export function installPackage(
  supertest: SuperTest.SuperTest<SuperTest.Test>,
  packageName: SupportedPackage
) {
  const pkg = PACKAGES.find(({ name }) => name === packageName);
  const request = supertest
    .post('/api/fleet/epm/packages')
    .set('kbn-xsrf', 'xxx')
    .set('content-type', 'application/zip');

  return new Promise<void>((resolve, reject) => {
    createReadStream(path.join(bundledPackagesLocation, `${pkg!.name}-${pkg!.version}.zip`))
      .on('data', (chunk) => request.write(chunk))
      .on('end', () => {
        request
          .send()
          .expect(200)
          .then(() => resolve())
          .catch(reject);
      });
  });
}
