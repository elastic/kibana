/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UninitialisedResourceState,
  LoadingResourceState,
  LoadedResourceState,
  FailedResourceState,
} from './async_resource_state';
import {
  isUninitialisedResourceState,
  isLoadingResourceState,
  isLoadedResourceState,
  isFailedResourceState,
  isStaleResourceState,
  getLastLoadedResourceState,
  getCurrentResourceError,
  isOutdatedResourceState,
} from './async_resource_state';

interface TestData {
  property: string;
}

const data: TestData = { property: 'value' };

const uninitialisedResourceState: UninitialisedResourceState = {
  type: 'UninitialisedResourceState',
};

const loadedResourceState: LoadedResourceState<TestData> = {
  type: 'LoadedResourceState',
  data,
};

const failedResourceStateInitially: FailedResourceState<TestData, {}> = {
  type: 'FailedResourceState',
  error: {},
};

const failedResourceStateSubsequently: FailedResourceState<TestData, {}> = {
  type: 'FailedResourceState',
  error: {},
  lastLoadedState: loadedResourceState,
};

const loadingResourceStateInitially: LoadingResourceState<TestData, {}> = {
  type: 'LoadingResourceState',
  previousState: uninitialisedResourceState,
};

const loadingResourceStateAfterSuccess: LoadingResourceState<TestData, {}> = {
  type: 'LoadingResourceState',
  previousState: loadedResourceState,
};

const loadingResourceStateAfterInitialFailure: LoadingResourceState<TestData, {}> = {
  type: 'LoadingResourceState',
  previousState: failedResourceStateInitially,
};

const loadingResourceStateAfterSubsequentFailure: LoadingResourceState<TestData, {}> = {
  type: 'LoadingResourceState',
  previousState: failedResourceStateSubsequently,
};

describe('AsyncResourceState', () => {
  describe('guards', () => {
    describe('isUninitialisedResourceState()', () => {
      it('returns true for UninitialisedResourceState', () => {
        expect(isUninitialisedResourceState(uninitialisedResourceState)).toBe(true);
      });

      it('returns false for LoadingResourceState', () => {
        expect(isUninitialisedResourceState(loadingResourceStateInitially)).toBe(false);
      });

      it('returns false for LoadedResourceState', () => {
        expect(isUninitialisedResourceState(loadedResourceState)).toBe(false);
      });

      it('returns false for FailedResourceState', () => {
        expect(isUninitialisedResourceState(failedResourceStateInitially)).toBe(false);
      });
    });

    describe('isLoadingResourceState()', () => {
      it('returns false for UninitialisedResourceState', () => {
        expect(isLoadingResourceState(uninitialisedResourceState)).toBe(false);
      });

      it('returns true for LoadingResourceState', () => {
        expect(isLoadingResourceState(loadingResourceStateInitially)).toBe(true);
      });

      it('returns false for LoadedResourceState', () => {
        expect(isLoadingResourceState(loadedResourceState)).toBe(false);
      });

      it('returns false for FailedResourceState', () => {
        expect(isLoadingResourceState(failedResourceStateInitially)).toBe(false);
      });
    });

    describe('isLoadedResourceState()', () => {
      it('returns false for UninitialisedResourceState', () => {
        expect(isLoadedResourceState(uninitialisedResourceState)).toBe(false);
      });

      it('returns false for LoadingResourceState', () => {
        expect(isLoadedResourceState(loadingResourceStateInitially)).toBe(false);
      });

      it('returns true for LoadedResourceState', () => {
        expect(isLoadedResourceState(loadedResourceState)).toBe(true);
      });

      it('returns false for FailedResourceState', () => {
        expect(isLoadedResourceState(failedResourceStateInitially)).toBe(false);
      });
    });

    describe('isFailedResourceState()', () => {
      it('returns false for UninitialisedResourceState', () => {
        expect(isFailedResourceState(uninitialisedResourceState)).toBe(false);
      });

      it('returns false for LoadingResourceState', () => {
        expect(isFailedResourceState(loadingResourceStateInitially)).toBe(false);
      });

      it('returns false for LoadedResourceState', () => {
        expect(isFailedResourceState(loadedResourceState)).toBe(false);
      });

      it('returns true for FailedResourceState', () => {
        expect(isFailedResourceState(failedResourceStateInitially)).toBe(true);
      });
    });

    describe('isStaleResourceState()', () => {
      it('returns true for UninitialisedResourceState', () => {
        expect(isStaleResourceState(uninitialisedResourceState)).toBe(true);
      });

      it('returns false for LoadingResourceState', () => {
        expect(isStaleResourceState(loadingResourceStateInitially)).toBe(false);
      });

      it('returns true for LoadedResourceState', () => {
        expect(isStaleResourceState(loadedResourceState)).toBe(true);
      });

      it('returns true for FailedResourceState', () => {
        expect(isStaleResourceState(failedResourceStateInitially)).toBe(true);
      });
    });
  });

  describe('functions', () => {
    describe('getLastLoadedResourceState()', () => {
      it('returns undefined for UninitialisedResourceState', () => {
        expect(getLastLoadedResourceState(uninitialisedResourceState)).toBeUndefined();
      });

      it('returns current state for LoadedResourceState', () => {
        expect(getLastLoadedResourceState(loadedResourceState)).toBe(loadedResourceState);
      });

      it('returns undefined for initial FailedResourceState', () => {
        expect(getLastLoadedResourceState(failedResourceStateInitially)).toBeUndefined();
      });

      it('returns last loaded state for subsequent FailedResourceState', () => {
        expect(getLastLoadedResourceState(failedResourceStateSubsequently)).toBe(
          loadedResourceState
        );
      });

      it('returns undefined for initial LoadingResourceState', () => {
        expect(getLastLoadedResourceState(loadingResourceStateInitially)).toBeUndefined();
      });

      it('returns previous state for LoadingResourceState after success', () => {
        expect(getLastLoadedResourceState(loadingResourceStateAfterSuccess)).toBe(
          loadedResourceState
        );
      });

      it('returns undefined for LoadingResourceState after initial failure', () => {
        expect(getLastLoadedResourceState(loadingResourceStateAfterInitialFailure)).toBeUndefined();
      });

      it('returns previous state for LoadingResourceState after subsequent failure', () => {
        expect(getLastLoadedResourceState(loadingResourceStateAfterSubsequentFailure)).toBe(
          loadedResourceState
        );
      });
    });

    describe('getCurrentResourceError()', () => {
      it('returns undefined for UninitialisedResourceState', () => {
        expect(getCurrentResourceError(uninitialisedResourceState)).toBeUndefined();
      });

      it('returns undefined for LoadedResourceState', () => {
        expect(getCurrentResourceError(loadedResourceState)).toBeUndefined();
      });

      it('returns error for FailedResourceState', () => {
        expect(getCurrentResourceError(failedResourceStateSubsequently)).toStrictEqual({});
      });

      it('returns undefined for LoadingResourceState', () => {
        expect(getCurrentResourceError(loadingResourceStateAfterSubsequentFailure)).toBeUndefined();
      });
    });

    describe('isOutdatedResourceState()', () => {
      const trueFreshnessTest = (testData: TestData) => true;
      const falseFreshnessTest = (testData: TestData) => false;

      it('returns true for UninitialisedResourceState', () => {
        expect(isOutdatedResourceState(uninitialisedResourceState, falseFreshnessTest)).toBe(true);
      });

      it('returns false for LoadingResourceState', () => {
        expect(isOutdatedResourceState(loadingResourceStateAfterSuccess, falseFreshnessTest)).toBe(
          false
        );
      });

      it('returns false for LoadedResourceState and fresh data', () => {
        expect(isOutdatedResourceState(loadedResourceState, trueFreshnessTest)).toBe(false);
      });

      it('returns true for LoadedResourceState and outdated data', () => {
        expect(isOutdatedResourceState(loadedResourceState, falseFreshnessTest)).toBe(true);
      });

      it('returns true for initial FailedResourceState', () => {
        expect(isOutdatedResourceState(failedResourceStateInitially, falseFreshnessTest)).toBe(
          true
        );
      });

      it('returns false for subsequent FailedResourceState and fresh data', () => {
        expect(isOutdatedResourceState(failedResourceStateSubsequently, trueFreshnessTest)).toBe(
          false
        );
      });

      it('returns true for subsequent FailedResourceState and outdated data', () => {
        expect(isOutdatedResourceState(failedResourceStateSubsequently, falseFreshnessTest)).toBe(
          true
        );
      });
    });
  });
});
