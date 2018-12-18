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
  superuser = 1,
  global_all = 2,
}

// these are the spaces that we care about
enum Spaces {
  space_1 = 128,
  space_2 = 256,
}

// the manual combination of users and spaces so we can use TypeScript's exhaustive switch
enum UsersAtSpaces {
  superuser_at_space_1 = Users.superuser | Spaces.space_1, //@ts-ignore bit-wise
  superuser_at_space_2 = Users.superuser | Spaces.space_2, //@ts-ignore bit-wise
  global_all_at_space_1 = Users.global_all | Spaces.space_1, //@ts-ignore bit-wise
  global_all_at_space_2 = Users.global_all | Spaces.space_2, //@ts-ignore bit-wise
}

class UnreachableError extends Error {
  constructor(val: never) {
    super(`Unreachable: ${val}`);
  }
}

async function forEachStringEnumAsync<T>(
  stringEnum: T,
  callback: (value: T[keyof T]) => void
): Promise<void> {
  for (const value of Object.values(stringEnum).filter(f => typeof f === 'number')) {
    await callback(value);
  }
}

function forEachStringEnum<T>(
  stringEnum: T,
  callback: (value: T[keyof T]) => void
): void {
  for (const value of Object.values(stringEnum).filter(f => typeof f === 'number')) {
    callback(value);
  }
}

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

class UserSpecification {
  public readonly username: string;
  public readonly password: string;
  public readonly fullName: string;
  public readonly role: CustomRoleSpecification | ReservedRoleSpecification;

  constructor(username: string, role: CustomRoleSpecification | ReservedRoleSpecification) {
    this.username = username;
    this.password = `${username}-password`;
    this.fullName = username;
    this.role = role;
  }
}

class UserSpecificationFactory {
  public static create(user: Users): UserSpecification {
    const username = Users[user];
    switch (user) {
      case Users.superuser:
        return new UserSpecification(username, { name: 'superuser' });
      case Users.global_all:
        return new UserSpecification(username, {
          name: 'global_all_role',
          kibana: {
            global: {
              minimum: ['all'],
            },
          },
        });
      default:
        throw new UnreachableError(user);
    }
  }
}

class SpaceSpecification {
  public readonly id: string;
  public readonly name: string;
  public readonly disabledFeatures: string[];
  constructor(id: string, disabledFeatures: string[]) {
    this.id = id;
    this.name = id;
    this.disabledFeatures = disabledFeatures;
  }
}

class SpaceSpecificationFactory {
  public static create(space: Spaces): SpaceSpecification {
    const spaceId = Spaces[space];
    switch (space) {
      case Spaces.space_1:
        return new SpaceSpecification(spaceId, []);
      case Spaces.space_2:
        return new SpaceSpecification(spaceId, ['discover']);
      default:
        throw new UnreachableError(space);
    }
  }
}

const getUser = (userAtSpace: UsersAtSpaces) : UserSpecification => {
  let found: UserSpecification | null = null;
  forEachStringEnum(Users, user => {
    if (userAtSpace & user) {
      found = UserSpecificationFactory.create(user);
    }
  })
  if (!found) {
    throw new Error('Unable to find user');
  }
  return found;
};

const getSpace = (userAtSpace: UsersAtSpaces) : SpaceSpecification => {
  let found: SpaceSpecification | null = null;
  forEachStringEnum(Spaces, space => {
    if (userAtSpace & space) {
      found = SpaceSpecificationFactory.create(space);
    }
  })
  if (!found) {
    throw new Error('Unable to find user');
  }
  return found;
}

// tslint:disable:no-default-export
export default function navLinksTests({ getService }: TestInvoker) {
  const securityService: SecurityService = getService('security');
  const spacesService: SpacesService = getService('spaces');
  const uiCapabilitiesService: UICapabilitiesService = getService('uiCapabilities');

  describe('navLinks', () => {
    before(async () => {
      await forEachStringEnumAsync(Spaces, async space => {
        const spaceSpecification = SpaceSpecificationFactory.create(space);
        await spacesService.create(spaceSpecification);
      });

      await forEachStringEnumAsync(Users, async user => {
        const userSpecification = UserSpecificationFactory.create(user);
        await securityService.user.create(userSpecification.username, {
          password: userSpecification.password,
          full_name: userSpecification.fullName,
          roles: [userSpecification.role.name],
        });
        if (isCustomRoleSpecification(userSpecification.role)) {
          await securityService.role.create(userSpecification.role.name, {
            kibana: userSpecification.role.kibana,
          });
        }
      });
    });

    after(async () => {
      await forEachStringEnumAsync(Spaces, async space => {
        const spaceSpecification = SpaceSpecificationFactory.create(space);
        await spacesService.delete(spaceSpecification.id);
      });

      await forEachStringEnumAsync(Users, async user => {
        const userSpecification = UserSpecificationFactory.create(user);
        await securityService.user.delete(userSpecification.username);
        if (isCustomRoleSpecification(userSpecification.role)) {
          await securityService.role.delete(userSpecification.role.name);
        }
      });
    });

    forEachStringEnum(UsersAtSpaces, (userAtSpace) => {

      it(`returns appropriate navLinks for ${userAtSpace}`, async () => {
        const user = getUser(userAtSpace);
        const space = getSpace(userAtSpace);

        const uiCapabilities = await uiCapabilitiesService.get({ username: user.username, password: user.password }, space.id);
        switch(userAtSpace) {
          case UsersAtSpaces.global_all_at_space_1:
          case UsersAtSpaces.superuser_at_space_1:
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
          case UsersAtSpaces.global_all_at_space_2:
          case UsersAtSpaces.superuser_at_space_2:
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
