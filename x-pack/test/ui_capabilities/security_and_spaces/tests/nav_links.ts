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

// TODO: Consolidate the following type definitions
interface CustomRoleSpecification {
  name: string;
  kibana: {
    global: {
      minimum?: string[];
      feature?: {
        [featureName: string]: string[];
      };
    };
    space?: {
      [spaceId: string]: {
        minimum?: string[];
        feature?: {
          [featureName: string]: string[];
        };
      };
    };
  };
}

interface ReservedRoleSpecification {
  name: string;
}

function isCustomRoleSpecification(
  roleSpecification: CustomRoleSpecification | ReservedRoleSpecification
): roleSpecification is CustomRoleSpecification {
  return (roleSpecification as CustomRoleSpecification).kibana !== undefined;
}

interface User {
  username: string;
  fullName: string;
  password: string;
  role: ReservedRoleSpecification | CustomRoleSpecification;
}

// these are the users that we care about
const Superuser: User = {
  username: 'superuser',
  fullName: 'superuser',
  password: 'superuser-password',
  role: {
    name: 'superuser',
  },
};

const GlobalAll: User = {
  username: 'global_all',
  fullName: 'global_all',
  password: 'global_all-password',
  role: {
    name: 'global_all_role',
    kibana: {
      global: {
        minimum: ['all'],
      },
    },
  },
};

const Users: User[] = [Superuser, GlobalAll];

// these are the spaces that we care about
interface Space {
  id: string;
  name: string;
  disabledFeatures: string[];
}
const Space1: Space = {
  id: 'space_1',
  name: 'space_1',
  disabledFeatures: [],
};

const Space2: Space = {
  id: 'space_2',
  name: 'space_2',
  disabledFeatures: ['discover'],
};

const Spaces: Space[] = [Space1, Space2];

interface Scenario {
  user: User;
  space: Space;
}

interface SuperuserAtSpace1 extends Scenario {
  id: 'superuser_at_space_1';
}
const SuperuserAtSpace1: SuperuserAtSpace1 = {
  id: 'superuser_at_space_1',
  user: Superuser,
  space: Space1,
};

interface SuperuserAtSpace2 extends Scenario {
  id: 'superuser_at_space_2';
}
const SuperuserAtSpace2: SuperuserAtSpace2 = {
  id: 'superuser_at_space_2',
  user: Superuser,
  space: Space2,
};

interface GlobalAllAtSpace1 extends Scenario {
  id: 'global_all_at_space_1';
}
const GlobalAllAtSpace1: GlobalAllAtSpace1 = {
  id: 'global_all_at_space_1',
  user: GlobalAll,
  space: Space1,
};

interface GlobalAllAtSpace2 extends Scenario {
  id: 'global_all_at_space_2';
}
const GlobalAllAtSpace2: GlobalAllAtSpace2 = {
  id: 'global_all_at_space_2',
  user: GlobalAll,
  space: Space2,
};

type UsersAtSpaces = SuperuserAtSpace1 | SuperuserAtSpace2 | GlobalAllAtSpace1 | GlobalAllAtSpace2;
const UsersAtSpaces: UsersAtSpaces[] = [
  SuperuserAtSpace1,
  SuperuserAtSpace2,
  GlobalAllAtSpace1,
  GlobalAllAtSpace2,
];

class UnreachableError extends Error {
  constructor(val: never) {
    super(`Unreachable: ${val}`);
  }
}

// tslint:disable:no-default-export
export default function navLinksTests({ getService }: TestInvoker) {
  const securityService: SecurityService = getService('security');
  const spacesService: SpacesService = getService('spaces');
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('navLinks', () => {
    before(async () => {
      for (const space of Spaces) {
        await spacesService.create(space);
      }

      for (const user of Users) {
        await securityService.user.create(user.username, {
          password: user.password,
          full_name: user.fullName,
          roles: [user.role.name],
        });
        if (isCustomRoleSpecification(user.role)) {
          await securityService.role.create(user.role.name, {
            kibana: user.role.kibana,
          });
        }
      }
    });

    after(async () => {
      for (const space of Spaces) {
        await spacesService.delete(space.id);
      }

      for (const user of Users) {
        await securityService.user.delete(user.username);
        if (isCustomRoleSpecification(user.role)) {
          await securityService.role.delete(user.role.name);
        }
      }
    });

    UsersAtSpaces.forEach(userAtSpace => {
      it(`returns appropriate navLinks for ${userAtSpace}`, async () => {
        const { user, space } = userAtSpace;

        const uiCapabilities = await uiCapabilitiesService.get(
          { username: user.username, password: user.password },
          space.id
        );
        switch (userAtSpace.id) {
          case 'superuser_at_space_1':
          case 'global_all_at_space_1':
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
            break;
          case 'superuser_at_space_2':
          case 'global_all_at_space_2':
            expect(uiCapabilities).to.have.property('navLinks');
            expect(uiCapabilities!.navLinks).to.eql({
              apm: true,
              canvas: true,
              graph: true,
              'infra:home': true,
              'infra:logs': true,
              'kibana:dashboard': true,
              'kibana:dev_tools': true,
              'kibana:discover': false,
              'kibana:management': true,
              'kibana:visualize': true,
              ml: true,
              monitoring: true,
              timelion: true,
            });
            break;
          default:
            throw new UnreachableError(userAtSpace);
        }
      });
    });
  });
}
