/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getHostNameSeparator,
  getHumanReadableLogonType,
  getTargetUserAndTargetDomain,
  getUserDomainField,
  getUserNameField,
  getEventDetails,
} from './helpers';

describe('helpers', () => {
  describe('#getHumanReadableLogonType', () => {
    test('it returns an empty string when endgameLogonType is undefined', () => {
      expect(getHumanReadableLogonType(undefined)).toEqual('');
    });

    test('it returns an empty string when endgameLogonType is null', () => {
      expect(getHumanReadableLogonType(null)).toEqual('');
    });

    test('it returns an empty string when endgameLogonType is NaN', () => {
      expect(getHumanReadableLogonType(NaN)).toEqual('');
    });

    test('it returns an empty string when endgameLogonType is Infinity', () => {
      expect(getHumanReadableLogonType(Infinity)).toEqual('');
    });

    test('it returns a string "0" given 0, an unknown logon type', () => {
      expect(getHumanReadableLogonType(0)).toEqual('0');
    });

    test('it returns a string "-1" given -1, an unknown logon type', () => {
      expect(getHumanReadableLogonType(-1)).toEqual('-1');
    });

    test('it returns "Interactive" given 2', () => {
      expect(getHumanReadableLogonType(2)).toEqual('Interactive');
    });

    test('it returns "Network" given 3', () => {
      expect(getHumanReadableLogonType(3)).toEqual('Network');
    });

    test('it returns "Batch" given 4', () => {
      expect(getHumanReadableLogonType(4)).toEqual('Batch');
    });

    test('it returns "Service" given 5', () => {
      expect(getHumanReadableLogonType(5)).toEqual('Service');
    });

    test('it returns "Unlock" given 7', () => {
      expect(getHumanReadableLogonType(7)).toEqual('Unlock');
    });

    test('it returns "Network Cleartext" given 8', () => {
      expect(getHumanReadableLogonType(8)).toEqual('Network Cleartext');
    });

    test('it returns "New Credentials" given 9', () => {
      expect(getHumanReadableLogonType(9)).toEqual('New Credentials');
    });

    test('it returns "Remote Interactive" given 10', () => {
      expect(getHumanReadableLogonType(10)).toEqual('Remote Interactive');
    });

    test('it returns "Cached Interactive" given 11', () => {
      expect(getHumanReadableLogonType(11)).toEqual('Cached Interactive');
    });
  });

  describe('#getHostNameSeparator', () => {
    test('it returns "@" when eventAction is undefined', () => {
      expect(getHostNameSeparator(undefined)).toEqual('@');
    });

    test('it returns "@" when eventAction is null', () => {
      expect(getHostNameSeparator(null)).toEqual('@');
    });

    test('it returns "@" when eventAction is an empty string', () => {
      expect(getHostNameSeparator('')).toEqual('@');
    });

    test('it returns "@" when eventAction is a random value', () => {
      expect(getHostNameSeparator('a random value')).toEqual('@');
    });

    test('it returns "@" when eventAction is "user_logoff"', () => {
      expect(getHostNameSeparator('user_logoff')).toEqual('@');
    });

    test('it returns "to" when eventAction is "explicit_user_logon"', () => {
      expect(getHostNameSeparator('explicit_user_logon')).toEqual('to');
    });
  });

  describe('#getTargetUserAndTargetDomain', () => {
    test('it returns false when eventAction is undefined', () => {
      expect(getTargetUserAndTargetDomain(undefined)).toEqual(false);
    });

    test('it returns false when eventAction is null', () => {
      expect(getTargetUserAndTargetDomain(null)).toEqual(false);
    });

    test('it returns false when eventAction is an empty string', () => {
      expect(getTargetUserAndTargetDomain('')).toEqual(false);
    });

    test('it returns false when eventAction is a random value', () => {
      expect(getTargetUserAndTargetDomain('a random value')).toEqual(false);
    });

    test('it returns true when eventAction is "explicit_user_logon"', () => {
      expect(getTargetUserAndTargetDomain('explicit_user_logon')).toEqual(true);
    });

    test('it returns true when eventAction is "user_logoff"', () => {
      expect(getTargetUserAndTargetDomain('user_logoff')).toEqual(true);
    });
  });

  describe('#getUserDomainField', () => {
    test('it returns user.domain when eventAction is undefined', () => {
      expect(getUserDomainField(undefined)).toEqual('user.domain');
    });

    test('it returns user.domain when eventAction is null', () => {
      expect(getUserDomainField(null)).toEqual('user.domain');
    });

    test('it returns user.domain when eventAction is an empty string', () => {
      expect(getUserDomainField('')).toEqual('user.domain');
    });

    test('it returns user.domain when eventAction is a random value', () => {
      expect(getUserDomainField('a random value')).toEqual('user.domain');
    });

    test('it returns endgame.target_domain_name when eventAction is "explicit_user_logon"', () => {
      expect(getUserDomainField('explicit_user_logon')).toEqual('endgame.target_domain_name');
    });

    test('it returns endgame.target_domain_name when eventAction is "user_logoff"', () => {
      expect(getUserDomainField('user_logoff')).toEqual('endgame.target_domain_name');
    });
  });

  describe('#getUserNameField', () => {
    test('it returns user.name when eventAction is undefined', () => {
      expect(getUserNameField(undefined)).toEqual('user.name');
    });

    test('it returns user.name when eventAction is null', () => {
      expect(getUserNameField(null)).toEqual('user.name');
    });

    test('it returns user.name when eventAction is an empty string', () => {
      expect(getUserNameField('')).toEqual('user.name');
    });

    test('it returns user.name when eventAction is a random value', () => {
      expect(getUserNameField('a random value')).toEqual('user.name');
    });

    test('it returns endgame.target_user_name when eventAction is "explicit_user_logon"', () => {
      expect(getUserNameField('explicit_user_logon')).toEqual('endgame.target_user_name');
    });

    test('it returns endgame.target_user_name when eventAction is "user_logoff"', () => {
      expect(getUserNameField('user_logoff')).toEqual('endgame.target_user_name');
    });
  });

  describe('#getEventDetails', () => {
    test('it returns an empty string when eventAction is "explicit_user_logon"', () => {
      expect(
        getEventDetails({ eventAction: 'explicit_user_logon', eventOutcome: undefined })
      ).toEqual('');
    });

    test('it returns logged off when eventAction is "log_off" and eventOutcome is null', () => {
      expect(getEventDetails({ eventAction: 'log_off', eventOutcome: null })).toEqual('logged off');
    });

    test('it returns logged off when eventAction is "log_off" and eventOutcome is undefined', () => {
      expect(getEventDetails({ eventAction: 'log_off', eventOutcome: undefined })).toEqual(
        'logged off'
      );
    });

    test('it returns failed to log off when eventAction is "log_off" and eventOutcome is failure', () => {
      expect(getEventDetails({ eventAction: 'log_off', eventOutcome: 'failure' })).toEqual(
        'failed to log off'
      );
    });

    test('it returns failed to log off when eventAction is "log_off" and eventOutcome is fAiLuRe', () => {
      expect(getEventDetails({ eventAction: 'log_off', eventOutcome: 'fAiLuRe' })).toEqual(
        'failed to log off'
      );
    });

    test('it returns logged off when eventAction is "log_off" and eventOutcome is anything_else', () => {
      expect(getEventDetails({ eventAction: 'log_off', eventOutcome: 'anything_else' })).toEqual(
        'logged off'
      );
    });

    test('it returns logged off when eventAction is "user_logoff" and eventOutcome is null', () => {
      expect(getEventDetails({ eventAction: 'user_logoff', eventOutcome: null })).toEqual(
        'logged off'
      );
    });

    test('it returns logged off when eventAction is "user_logoff" and eventOutcome is undefined', () => {
      expect(getEventDetails({ eventAction: 'user_logoff', eventOutcome: undefined })).toEqual(
        'logged off'
      );
    });

    test('it returns failed to log off when eventAction is "user_logoff" and eventOutcome is failure', () => {
      expect(getEventDetails({ eventAction: 'user_logoff', eventOutcome: 'failure' })).toEqual(
        'failed to log off'
      );
    });

    test('it returns failed to log off when eventAction is "user_logoff" and eventOutcome is fAiLuRe', () => {
      expect(getEventDetails({ eventAction: 'user_logoff', eventOutcome: 'fAiLuRe' })).toEqual(
        'failed to log off'
      );
    });

    test('it returns logged off when eventAction is "user_logoff" and eventOutcome is anything_else', () => {
      expect(
        getEventDetails({ eventAction: 'user_logoff', eventOutcome: 'anything_else' })
      ).toEqual('logged off');
    });

    test('it returns successfully logged in when eventAction is null and eventOutcome is undefined', () => {
      expect(getEventDetails({ eventAction: null, eventOutcome: undefined })).toEqual(
        'successfully logged in'
      );
    });

    test('it returns successfully logged in when eventAction is null and eventOutcome is null', () => {
      expect(getEventDetails({ eventAction: null, eventOutcome: null })).toEqual(
        'successfully logged in'
      );
    });

    test('it returns successfully logged in when eventAction is undefined and eventOutcome is null', () => {
      expect(getEventDetails({ eventAction: undefined, eventOutcome: null })).toEqual(
        'successfully logged in'
      );
    });

    test('it returns successfully logged in when eventAction is undefined and eventOutcome is undefined', () => {
      expect(getEventDetails({ eventAction: undefined, eventOutcome: undefined })).toEqual(
        'successfully logged in'
      );
    });

    test('it returns successfully logged in when eventAction is anything_else and eventOutcome is undefined', () => {
      expect(getEventDetails({ eventAction: 'anything_else', eventOutcome: undefined })).toEqual(
        'successfully logged in'
      );
    });

    test('it returns successfully logged in when eventAction is anything_else and eventOutcome is null', () => {
      expect(getEventDetails({ eventAction: 'anything_else', eventOutcome: null })).toEqual(
        'successfully logged in'
      );
    });

    test('it returns failed to log in when eventAction is anything_else and eventOutcome is failure', () => {
      expect(getEventDetails({ eventAction: 'anything_else', eventOutcome: 'failure' })).toEqual(
        'failed to log in'
      );
    });

    test('it returns failed to log in when eventAction is anything_else and eventOutcome is fAiLuRe', () => {
      expect(getEventDetails({ eventAction: 'anything_else', eventOutcome: 'fAiLuRe' })).toEqual(
        'failed to log in'
      );
    });
  });
});
