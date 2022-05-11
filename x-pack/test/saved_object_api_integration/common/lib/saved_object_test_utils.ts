/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Client } from '@elastic/elasticsearch';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { SPACES, ALL_SPACES_ID } from './spaces';
import { AUTHENTICATION } from './authentication';
import { TestCase, TestUser, ExpectResponseBody } from './types';

const {
  DEFAULT: { spaceId: DEFAULT_SPACE_ID },
  SPACE_1: { spaceId: SPACE_1_ID },
  SPACE_2: { spaceId: SPACE_2_ID },
} = SPACES;
const {
  NOT_A_KIBANA_USER,
  SUPERUSER,
  KIBANA_LEGACY_USER,
  KIBANA_DUAL_PRIVILEGES_USER,
  KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
  KIBANA_RBAC_USER,
  KIBANA_RBAC_DASHBOARD_ONLY_USER,
  KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
  KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
  KIBANA_RBAC_SPACE_1_ALL_USER,
  KIBANA_RBAC_SPACE_1_READ_USER,
} = AUTHENTICATION;

export function getUrlPrefix(spaceId: string) {
  return spaceId && spaceId !== DEFAULT_SPACE_ID ? `/s/${spaceId}` : ``;
}

export function getExpectedSpaceIdProperty(spaceId: string) {
  if (spaceId === DEFAULT_SPACE_ID) {
    return {};
  }
  return {
    spaceId,
  };
}

export const getTestTitle = (
  testCaseOrCases: TestCase | TestCase[],
  bulkStatusCode?: 200 | 403 // only used for bulk test suites; other suites specify forbidden/permitted in each test case
) => {
  const testCases = Array.isArray(testCaseOrCases) ? testCaseOrCases : [testCaseOrCases];
  const stringify = (array: TestCase[]) => array.map((x) => `${x.type}/${x.id}`).join();
  if (bulkStatusCode === 403 || (testCases.length === 1 && testCases[0].failure === 403)) {
    return `forbidden [${stringify(testCases)}]`;
  }
  if (testCases.find((x) => x.failure === 403)) {
    throw new Error(
      'Cannot create test title for multiple forbidden test cases; specify individual tests for each of these test cases'
    );
  }
  // permitted
  const list: string[] = [];
  Object.entries({
    success: undefined,
    'bad request': 400,
    'not found': 404,
    conflict: 409,
  }).forEach(([descriptor, failure]) => {
    const filtered = testCases.filter((x) => x.failure === failure);
    if (filtered.length) {
      list.push(`${descriptor} [${stringify(filtered)}]`);
    }
  });
  return `${list.join(' and ')}`;
};

export const isUserAuthorizedAtSpace = (user: TestUser | undefined, namespace: string) =>
  !user ||
  (user.authorizedAtSpaces.length > 0 && namespace === ALL_SPACES_ID) ||
  user.authorizedAtSpaces.includes('*') ||
  user.authorizedAtSpaces.includes(namespace);

export const getRedactedNamespaces = (
  user: TestUser | undefined,
  namespaces: string[] | undefined
) => namespaces?.map((x) => (isUserAuthorizedAtSpace(user, x) ? x : '?')).sort(namespaceComparator);
function namespaceComparator(a: string, b: string) {
  // namespaces get sorted so that they're all in alphabetical order, and unknown ones appear at the end
  // this is to prevent information disclosure
  if (a === '?' && b !== '?') {
    return 1;
  } else if (b === '?' && a !== '?') {
    return -1;
  } else if (a > b) {
    return 1;
  } else if (a < b) {
    return -1;
  }
  return 0;
}

export const testCaseFailures = {
  // test suites need explicit return types for number primitives
  fail400: (condition?: boolean): { failure?: 400 } =>
    condition !== false ? { failure: 400 } : {},
  fail404: (condition?: boolean): { failure?: 404 } =>
    condition !== false ? { failure: 404 } : {},
  fail409: (condition?: boolean): { failure?: 409 } =>
    condition !== false ? { failure: 409 } : {},
};

/**
 * Test cases have additional properties that we don't want to send in HTTP Requests
 */
export const createRequest = ({ type, id }: TestCase) => ({ type, id });

const uniq = <T>(arr: T[]): T[] => Array.from(new Set<T>(arr));
const isNamespaceAgnostic = (type: string) => type === 'globaltype';
const isMultiNamespace = (type: string) => type === 'sharedtype' || type === 'sharecapabletype';
export const expectResponses = {
  forbiddenTypes:
    (action: string) =>
    (typeOrTypes: string | string[]): ExpectResponseBody =>
    async (response: Record<string, any>) => {
      const types = Array.isArray(typeOrTypes) ? typeOrTypes : [typeOrTypes];
      const uniqueSorted = uniq(types).sort();
      expect(response.body).to.eql({
        statusCode: 403,
        error: 'Forbidden',
        message: `Unable to ${action} ${uniqueSorted.join()}`,
      });
    },
  forbiddenSpaces: (response: Record<string, any>) => {
    expect(response.body).to.eql({
      statusCode: 403,
      error: 'Forbidden',
      message: `Forbidden`,
    });
  },
  permitted: async (object: Record<string, any>, testCase: TestCase) => {
    const { type, id, failure } = testCase;
    if (failure) {
      let error: ReturnType<typeof SavedObjectsErrorHelpers['decorateGeneralError']>;
      if (failure === 400) {
        error = SavedObjectsErrorHelpers.createUnsupportedTypeError(type);
      } else if (failure === 404) {
        error = SavedObjectsErrorHelpers.createGenericNotFoundError(type, id);
      } else if (failure === 409) {
        error = SavedObjectsErrorHelpers.createConflictError(type, id);
      } else {
        throw new Error(`Encountered unexpected error code ${failure}`);
      }
      // should not call permitted with a 403 failure case
      if (object.type && object.id) {
        // bulk request error
        expect(object.type).to.eql(type);
        expect(object.id).to.eql(id);
        expect(object.error.error).to.eql(error.output.payload.error);
        expect(object.error.statusCode).to.eql(error.output.payload.statusCode);
        // ignore the error.message, because it can vary for decorated errors
      } else {
        // non-bulk request error
        expect(object.error).to.eql(error.output.payload.error);
        expect(object.statusCode).to.eql(error.output.payload.statusCode);
        // ignore the error.message, because it can vary for decorated errors
      }
    } else {
      // fall back to default behavior of testing the success outcome
      expect(object.type).to.eql(type);
      if (id) {
        expect(object.id).to.eql(id);
      } else {
        // created an object without specifying the ID, so it was auto-generated
        expect(object.id).to.match(/^[0-9a-f-]{36}$/);
      }
      expect(object).not.to.have.property('error');
      expect(object.updated_at).to.match(/^[\d-]{10}T[\d:\.]{12}Z$/);
      // don't test attributes, version, or references
    }
  },
  /**
   * Additional assertions that we use in `import` and `resolve_import_errors` to ensure that
   * newly-created (or overwritten) objects don't have unexpected properties
   */
  successCreated: async (es: Client, spaceId: string, type: string, id: string) => {
    const isNamespaceUndefined =
      spaceId === SPACES.DEFAULT.spaceId || isNamespaceAgnostic(type) || isMultiNamespace(type);
    const expectedSpacePrefix = isNamespaceUndefined ? '' : `${spaceId}:`;
    const savedObject = await es.get<Record<string, any>>({
      id: `${expectedSpacePrefix}${type}:${id}`,
      index: '.kibana',
    });
    return savedObject;
  },
};

const commonUsers = {
  noAccess: {
    ...NOT_A_KIBANA_USER,
    description: 'user with no access',
    authorizedAtSpaces: [],
  },
  superuser: {
    ...SUPERUSER,
    description: 'superuser',
    authorizedAtSpaces: ['*'],
  },
  legacyAll: { ...KIBANA_LEGACY_USER, description: 'legacy user', authorizedAtSpaces: [] },
  allGlobally: {
    ...KIBANA_RBAC_USER,
    description: 'rbac user with all globally',
    authorizedAtSpaces: ['*'],
  },
  readGlobally: {
    ...KIBANA_RBAC_DASHBOARD_ONLY_USER,
    description: 'rbac user with read globally',
    authorizedAtSpaces: ['*'],
  },
  dualAll: {
    ...KIBANA_DUAL_PRIVILEGES_USER,
    description: 'dual-privileges user',
    authorizedAtSpaces: ['*'],
  },
  dualRead: {
    ...KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER,
    description: 'dual-privileges readonly user',
    authorizedAtSpaces: ['*'],
  },
};

interface Security<T> {
  modifier?: T;
  users: Record<
    | keyof typeof commonUsers
    | 'allAtDefaultSpace'
    | 'readAtDefaultSpace'
    | 'allAtSpace1'
    | 'readAtSpace1',
    TestUser
  >;
}
interface SecurityAndSpaces<T> {
  modifier?: T;
  users: Record<
    keyof typeof commonUsers | 'allAtSpace' | 'readAtSpace' | 'allAtOtherSpace',
    TestUser
  >;
  spaceId: string;
}
interface Spaces<T> {
  modifier?: T;
  spaceId: string;
}

/**
 * Get test scenarios for each type of suite.
 * @param modifier Use this to generate additional permutations of test scenarios.
 *  For instance, a modifier of ['foo', 'bar'] would return
 *  a `securityAndSpaces` of: [
 *    { spaceId: DEFAULT_SPACE_ID, users: {...}, modifier: 'foo' },
 *    { spaceId: DEFAULT_SPACE_ID, users: {...}, modifier: 'bar' },
 *    { spaceId: SPACE_1_ID, users: {...}, modifier: 'foo' },
 *    { spaceId: SPACE_1_ID, users: {...}, modifier: 'bar' },
 *  ]
 */
export const getTestScenarios = <T>(modifiers?: T[]) => {
  let spaces: Array<Spaces<T>> = [DEFAULT_SPACE_ID, SPACE_1_ID, SPACE_2_ID].map((x) => ({
    spaceId: x,
  }));
  let security: Array<Security<T>> = [
    {
      users: {
        ...commonUsers,
        allAtDefaultSpace: {
          ...KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          description: 'rbac user with all at default space',
          authorizedAtSpaces: ['default'],
        },
        readAtDefaultSpace: {
          ...KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
          description: 'rbac user with read at default space',
          authorizedAtSpaces: ['default'],
        },
        allAtSpace1: {
          ...KIBANA_RBAC_SPACE_1_ALL_USER,
          description: 'rbac user with all at space_1',
          authorizedAtSpaces: ['space_1'],
        },
        readAtSpace1: {
          ...KIBANA_RBAC_SPACE_1_READ_USER,
          description: 'rbac user with read at space_1',
          authorizedAtSpaces: ['space_1'],
        },
      },
    },
  ];
  let securityAndSpaces: Array<SecurityAndSpaces<T>> = [
    {
      spaceId: DEFAULT_SPACE_ID,
      users: {
        ...commonUsers,
        allAtSpace: {
          ...KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          description: 'user with all at the space',
          authorizedAtSpaces: ['default'],
        },
        readAtSpace: {
          ...KIBANA_RBAC_DEFAULT_SPACE_READ_USER,
          description: 'user with read at the space',
          authorizedAtSpaces: ['default'],
        },
        allAtOtherSpace: {
          ...KIBANA_RBAC_SPACE_1_ALL_USER,
          description: 'user with all at other space',
          authorizedAtSpaces: ['space_1'],
        },
      },
    },
    {
      spaceId: SPACE_1_ID,
      users: {
        ...commonUsers,
        allAtSpace: {
          ...KIBANA_RBAC_SPACE_1_ALL_USER,
          description: 'user with all at the space',
          authorizedAtSpaces: ['space_1'],
        },
        readAtSpace: {
          ...KIBANA_RBAC_SPACE_1_READ_USER,
          description: 'user with read at the space',
          authorizedAtSpaces: ['space_1'],
        },
        allAtOtherSpace: {
          ...KIBANA_RBAC_DEFAULT_SPACE_ALL_USER,
          description: 'user with all at other space',
          authorizedAtSpaces: ['default'],
        },
      },
    },
  ];
  if (modifiers) {
    const addModifier = <U>(list: U[]) =>
      list.map((x) => modifiers.map((modifier) => ({ ...x, modifier }))).flat();
    spaces = addModifier(spaces);
    security = addModifier(security);
    securityAndSpaces = addModifier(securityAndSpaces);
  }
  return {
    spaces,
    security,
    securityAndSpaces,
  };
};
