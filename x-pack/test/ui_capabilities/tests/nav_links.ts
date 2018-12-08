/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { TestInvoker } from '../../common/types';
import { UICapabilitiesService } from '../services/ui_capabilities';

// tslint:disable:no-default-export
export default function navLinksTests({ getService }: TestInvoker) {
  const uiCapabilitiesService = getService('uiCapabilities') as UICapabilitiesService;

  describe('navLinks', () => {
    it('returns all nav links', async () => {
      const uiCapabilities = await uiCapabilitiesService.get();
      expect(uiCapabilities.navLinks).to.eql({
        apm: true,
        canvas: true,
        graph: true,
        'infra:home': true,
        'infra:logs': true,
        'kibana:dashboard': true,
        'kibana:dev_tools': true,
        'kibana:discover': true,
        'kibana:management': true,
        'kibana:visualize': true,
        ml: true,
        monitoring: true,
        timelion: true,
      });
    });
  });
}
