/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { SpacesService } from '../../../common/services';
import { SecurityService } from '../../../common/services';
import { TestInvoker } from '../../../common/types';
import { UICapabilitiesService } from '../../common/services/ui_capabilities';

// these are the users that we care about
enum Users {
  superuser,
  global_all,
}

// these are the spaces that we care about
enum Spaces {
  space_1,
  space_2,
}

// the manual combination of users and spaces so we can use TypeScript's exhaustive switch
enum UsersAtSpaces {
  superuser_at_default,
  superuser_at_space_1,
  global_all_at_default,
  global_all_at_space_1,
}

class UnreachableError extends Error {
  constructor(val: never) {
    super(`Unreachable: ${val}`);
  }
}

async function forEachStringEnum<T>(
  stringEnum: T,
  callback: (value: T[keyof T]) => void
): Promise<void> {
  for (const value of Object.values(stringEnum).filter(f => typeof f === 'number')) {
    await callback(value);
  }
}

// tslint:disable:no-default-export
export default function navLinksTests({ getService }: TestInvoker) {
  const securityService: SecurityService = getService('security');
  const spacesService: SpacesService = getService('spaces');
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('navLinks', () => {
    before(async () => {
      await forEachStringEnum(Spaces, async space => {
        switch (space) {
          case Spaces.space_1:
            await spacesService.create({
              id: 'space_1',
              name: 'space_1',
              disabledFeatures: [],
            });
            break;
          case Spaces.space_2:
            await spacesService.create({
              id: 'space_2',
              name: 'space_2',
              disabledFeatures: [],
            });
            break;
          default:
            throw new UnreachableError(space);
        }
      });

      await forEachStringEnum(Users, async user => {
        switch (user) {
          case Users.superuser:
            await securityService.user.create('superuser', {
              password: 'password',
              roles: ['superuser'],
              full_name: 'superuser',
            });
          case Users.global_all:
            await securityService.role.create('global_discover_all_role', {
              kibana: {
                global: {
                  feature: {
                    discover: ['all'],
                  },
                },
              },
            });

            await securityService.user.create('global_discover_all_user', {
              password: 'password',
              roles: ['global_discover_all_role'],
              full_name: 'global discover all user',
            });
            break;
          default:
            throw new UnreachableError(user);
        }
      });
    });

    after(async () => {
      await forEachStringEnum(Spaces, async space => {
        switch (space) {
          case Spaces.space_1:
            await spacesService.delete('space_1');
            break;
          case Spaces.space_2:
            await spacesService.delete('space_2');
            break;
          default:
            throw new UnreachableError(space);
        }
      });
    });

    it('returns all nav links', async () => {
      const superuser = {
        username: 'superuser',
        password: 'password',
      };
      const uiCapabilities = await uiCapabilitiesService.get(superuser);
      expect(uiCapabilities).to.have.property('navLinks');
      expect(uiCapabilities!.navLinks).to.eql({
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
