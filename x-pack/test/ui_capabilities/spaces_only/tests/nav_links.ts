/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SpacesService } from '../../../common/services';
import { TestInvoker } from '../../../common/types';
import { navLinksBuilder } from '../../common/nav_links_builder';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';
import { SpaceScenarios } from '../scenarios';

// tslint:disable:no-default-export
export default function navLinksTests({ getService }: TestInvoker) {
  const spacesService: SpacesService = getService('spaces');
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('navLinks', () => {
    before(async () => {
      for (const space of SpaceScenarios) {
        await spacesService.create(space);
      }
    });

    after(async () => {
      for (const space of SpaceScenarios) {
        await spacesService.delete(space.id);
      }
    });

    SpaceScenarios.forEach(scenario => {
      it(`${scenario.name}`, async () => {
        const uiCapabilities = await uiCapabilitiesService.get(null, scenario.id);
        switch (scenario.id) {
          case 'space_with_all_features':
            expect(uiCapabilities).to.have.property('navLinks');
            expect(uiCapabilities!.navLinks).to.eql(navLinksBuilder.all());
            break;
          case 'space_with_no_features':
            expect(uiCapabilities).to.have.property('navLinks');
            expect(uiCapabilities!.navLinks).to.eql(navLinksBuilder.none());
            break;
          default:
            throw new UnreachableError(scenario);
        }
      });
    });
  });
}
