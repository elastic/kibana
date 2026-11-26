/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { crashFingerprint } from './crash_fingerprint';
import {
  CRASH_FINGERPRINT_CASES,
  EXPECTED_CRASH_FINGERPRINTS,
  crashFingerprintOf,
  crashFramesOf,
  isIosReportOf,
} from './crash_fingerprint.test_helpers';

const fingerprintOf = (name: keyof typeof CRASH_FINGERPRINT_CASES) =>
  crashFingerprintOf(CRASH_FINGERPRINT_CASES[name]);

describe('crash fingerprint rules', () => {
  // The expected fingerprints are Elasticsearch's: the Scout API spec `mobile_crashes.spec.ts`
  // indexes these cases and checks the ES|QL computes them, so this copy can't drift from it.
  it.each(Object.keys(CRASH_FINGERPRINT_CASES) as Array<keyof typeof CRASH_FINGERPRINT_CASES>)(
    'gives %s the fingerprint Elasticsearch computes',
    (name) => {
      expect(fingerprintOf(name)).toBe(EXPECTED_CRASH_FINGERPRINTS[name]);
    }
  );

  it('ignores JVM line numbers, as a rebuild moves them', () => {
    expect(fingerprintOf('jvmLine88')).toBe(fingerprintOf('jvmLine91'));
    expect(crashFramesOf(CRASH_FINGERPRINT_CASES.jvmLine88)).toBe(
      '\tat com.example.app.ui.MainActivity.onResume(MainActivity.kt)\n' +
        '\tat android.os.Handler.handleCallback(Handler.java)'
    );
  });

  it('splits the same frames of another exception type', () => {
    expect(fingerprintOf('jvmOtherType')).not.toBe(fingerprintOf('jvmLine88'));
  });

  it('ignores the header and load addresses of an iOS report, which change per launch', () => {
    expect(fingerprintOf('iosLaunchA')).toBe(fingerprintOf('iosLaunchB'));
    expect(crashFramesOf(CRASH_FINGERPRINT_CASES.iosLaunchA)).toBe(
      '0 libsystem_kernel.dylib + 198940\n1 RideIos + 14587904'
    );
  });

  it('reads the last exception backtrace of an iOS report when it has one', () => {
    expect(fingerprintOf('iosExceptionA')).toBe(fingerprintOf('iosExceptionB'));
    expect(crashFramesOf(CRASH_FINGERPRINT_CASES.iosExceptionA)).toBe(
      '0 CoreFoundation + 233480\n1 RideIos + 40081848'
    );
  });

  it('groups React Native JavaScript errors by message, numbers aside', () => {
    expect(fingerprintOf('javascriptIndex5')).toBe(fingerprintOf('javascriptIndex7'));
    expect(fingerprintOf('javascriptIban')).not.toBe(fingerprintOf('javascriptMap'));
    expect(crashFramesOf(CRASH_FINGERPRINT_CASES.javascriptIban)).toBe(
      "TypeError: undefined is not an object (evaluating 'payee.iban')"
    );
  });

  it("tells an iOS report by how it starts, not by a line an error's message can repeat", () => {
    expect(isIosReportOf(CRASH_FINGERPRINT_CASES.iosLaunchA)).toBe(true);
    expect(isIosReportOf(CRASH_FINGERPRINT_CASES.jvmMentioningCrashed)).toBe(false);
    expect(isIosReportOf(CRASH_FINGERPRINT_CASES.javascriptMentioningCrashed)).toBe(false);
    // Read with the JVM rules: the message line goes, so it groups with the same type's frames.
    expect(fingerprintOf('jvmMentioningCrashed')).toBe(fingerprintOf('jvmOtherType'));
  });

  it('keeps the stored fingerprint over the computed one', () => {
    expect(fingerprintOf('stored')).toBe('ingest-fingerprint');
  });
});

describe('crashFingerprint', () => {
  const printed = esql`FROM logs`.pipe`EVAL fingerprint = ${crashFingerprint()}`.print('basic');

  it('prefers the stored fingerprint', () => {
    expect(printed).toContain('COALESCE(`attributes.exception.fingerprint`, SHA256(');
  });

  it('reads JavaScript errors from their message and other crashes from their stack trace', () => {
    expect(printed).toContain('`attributes.exception.type` LIKE "*JavascriptException"');
    expect(printed).toContain('REPLACE(`attributes.exception.message`, "(?s)\\\\n.*", "")');
    expect(printed).toContain('`attributes.exception.stacktrace` LIKE "Incident Identifier:*"');
  });
});
