/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getListOfCancelableResponseActions,
  isResponseActionCancelable,
} from './is_response_action_cancelable';

describe('cancelable response actions util', () => {
  describe('isResponseActionCancelable()', () => {
    describe('when agentType is `endpoint`', () => {
      it.each(['get-file', 'execute', 'upload', 'scan', 'runscript', 'memory-dump'] as const)(
        'should return true for command `%s`',
        (command) => {
          expect(isResponseActionCancelable(command, 'endpoint')).toBe(true);
        }
      );

      it.each([
        'cancel',
        'isolate',
        'unisolate',
        'kill-process',
        'suspend-process',
        'running-processes',
      ] as const)('should return false for command `%s`', (command) => {
        expect(isResponseActionCancelable(command, 'endpoint')).toBe(false);
      });
    });

    describe('when agentType is `sentinel_one`', () => {
      it.each([
        'isolate',
        'unisolate',
        'kill-process',
        'suspend-process',
        'running-processes',
        'get-file',
        'execute',
        'upload',
        'scan',
        'cancel',
        'runscript',
        'memory-dump',
      ] as const)('should return false for command `%s`', (command) => {
        expect(isResponseActionCancelable(command, 'sentinel_one')).toBe(false);
      });
    });

    describe('when agentType is `crowdstrike`', () => {
      it.each([
        'isolate',
        'unisolate',
        'kill-process',
        'suspend-process',
        'running-processes',
        'get-file',
        'execute',
        'upload',
        'scan',
        'cancel',
        'runscript',
        'memory-dump',
      ] as const)('should return false for command `%s`', (command) => {
        expect(isResponseActionCancelable(command, 'crowdstrike')).toBe(false);
      });
    });

    describe('when agentType is `microsoft_defender_endpoint`', () => {
      it.each(['isolate', 'unisolate', 'runscript'] as const)(
        'should return true for command `%s`',
        (command) => {
          expect(isResponseActionCancelable(command, 'microsoft_defender_endpoint')).toBe(true);
        }
      );

      it.each([
        'kill-process',
        'suspend-process',
        'running-processes',
        'get-file',
        'execute',
        'upload',
        'scan',
        'cancel',
        'memory-dump',
      ])('should return false for command: %s', () => {
        expect(isResponseActionCancelable('cancel', 'microsoft_defender_endpoint')).toBe(false);
      });
    });
  });

  describe('getListOfCancelableResponseActions()', () => {
    it('should return cancelable commands for `endpoint`', () => {
      expect(getListOfCancelableResponseActions('endpoint')).toEqual([
        'get-file',
        'execute',
        'upload',
        'scan',
        'runscript',
        'memory-dump',
      ]);
    });

    it('should return empty list for `sentinel_one`', () => {
      expect(getListOfCancelableResponseActions('sentinel_one')).toEqual([]);
    });

    it('should return empty list for `crowdstrike`', () => {
      expect(getListOfCancelableResponseActions('crowdstrike')).toEqual([]);
    });

    it('should return cancelable commands for `microsoft_defender_endpoint`', () => {
      expect(getListOfCancelableResponseActions('microsoft_defender_endpoint')).toEqual([
        'isolate',
        'unisolate',
        'runscript',
      ]);
    });
  });
});
