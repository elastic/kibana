/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');

  describe('XPack Main Info', () => {
    it('should provide xpack data for test environment', async () => {
      const { body } = await supertest
        .get('/api/xpack_main_info/info')
        .set('kbn-xsrf', 'xxx')
        .expect(200);

      const { features, license } = body.info;

      expect(features.graph).to.eql({ enableAppLink: true, showAppLink: true });
      expect(features.grokdebugger).to.eql({
        enableAPIRoute: true,
        enableLink: true
      });
      expect(features.index_management).to.eql({
        enableLinks: true,
        isAvailable: true,
        showLinks: true
      });
      expect(features.logstash).to.eql({
        enableLinks: true,
        isAvailable: true,
        isReadOnly: false
      });
      expect(features.ml).to.eql({
        enableLinks: true,
        hasExpired: false,
        isAvailable: true,
        showLinks: true
      });
      expect(features.reporting).to.eql({
        csv: { enableLinks: true, showLinks: true },
        management: {
          enableLinks: true,
          jobTypes: ['csv', 'printable_pdf'],
          showLinks: true
        },
        printablePdf: { enableLinks: true, showLinks: true }
      });
      expect(features.searchprofiler).to.eql({
        enableAppLink: true,
        showAppLink: true
      });
      expect(features.security).to.eql({
        allowLogin: true,
        allowRbac: true,
        allowRoleDocumentLevelSecurity: true,
        allowRoleFieldLevelSecurity: true,
        showLinks: true,
        showLogin: true
      });
      expect(features.spaces).to.eql({ showSpaces: true });
      expect(features.tilemap.license.active).to.be(true);
      expect(features.tilemap.license.valid).to.be(true);
      expect(features.watcher).to.eql({
        enableLinks: true,
        isAvailable: true,
        showLinks: true
      });

      expect(license.isActive).to.be(true);
      expect(license.type).to.be('trial');
    });
  });
}
