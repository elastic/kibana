/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import {
  IOS_REPORT_OS_VERSION_RULE,
  IOS_REPORT_RELEASE_RULE,
  crashFingerprint,
  crashFrameRuleFlags,
} from './crash_fingerprint';
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

  it('keeps only the type of a cause or suppressed exception, and not how many frames it shares', () => {
    expect(fingerprintOf('jvmCauseA')).toBe(fingerprintOf('jvmCauseB'));
    expect(crashFramesOf(CRASH_FINGERPRINT_CASES.jvmCauseA)).toBe(
      [
        '\tat android.app.ActivityThread.performResumeActivity(ActivityThread.java)',
        '\tat android.os.Handler.handleCallback(Handler.java)',
        'Caused by: java.lang.IllegalStateException',
        '\tat androidx.fragment.app.Fragment.requireContext(Fragment.java)',
        '\tat com.example.app.ui.HomeFragment.onResume(HomeFragment.kt)',
        '\t... more',
        '\tSuppressed: java.io.IOException',
        '\t\tat java.io.BufferedInputStream.read(BufferedInputStream.java)',
      ].join('\n')
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

  it('reads an iOS report with CRLF line breaks as the same report', () => {
    expect(fingerprintOf('iosCrlf')).toBe(fingerprintOf('iosLaunchA'));
  });

  it("groups iOS reports without a crashed thread by type, never by their header's identifier", () => {
    expect(fingerprintOf('iosHeaderOnlyA')).toBe(fingerprintOf('iosHeaderOnlyB'));
    expect(crashFramesOf(CRASH_FINGERPRINT_CASES.iosHeaderOnlyA)).toBe('');
  });

  it('ignores the address of a symbolicated iOS frame, which changes per launch', () => {
    expect(fingerprintOf('iosSymbolicatedA')).toBe(fingerprintOf('iosSymbolicatedB'));
    expect(crashFramesOf(CRASH_FINGERPRINT_CASES.iosSymbolicatedA)).toBe(
      '0 CoreFoundation __exceptionPreprocess + 164\n1 RideIos RideViewController.start() + 88'
    );
  });

  it('groups React Native JavaScript errors by message, numbers aside', () => {
    expect(fingerprintOf('javascriptIndex5')).toBe(fingerprintOf('javascriptIndex7'));
    expect(fingerprintOf('javascriptIban')).not.toBe(fingerprintOf('javascriptMap'));
    expect(crashFramesOf(CRASH_FINGERPRINT_CASES.javascriptIban)).toBe(
      "TypeError: undefined is not an object (evaluating 'payee.iban')"
    );
  });

  it('groups the JavaScript errors EDOT React Native reports itself by message, not by stack', () => {
    expect(fingerprintOf('javascriptSourceA')).toBe(fingerprintOf('javascriptSourceB'));
    expect(crashFramesOf(CRASH_FINGERPRINT_CASES.javascriptSourceA)).toBe(
      "undefined is not an object (evaluating 'payee.iban')"
    );
  });

  it("tells an iOS report by how it starts, not by a line an error's message can repeat", () => {
    expect(isIosReportOf(CRASH_FINGERPRINT_CASES.iosLaunchA)).toBe(true);
    expect(isIosReportOf(CRASH_FINGERPRINT_CASES.jvmMentioningCrashed)).toBe(false);
    expect(isIosReportOf(CRASH_FINGERPRINT_CASES.jvmMentioningIncident)).toBe(false);
    expect(isIosReportOf(CRASH_FINGERPRINT_CASES.javascriptMentioningCrashed)).toBe(false);
    // Read with the JVM rules: the message line goes, so it groups with the same type's frames.
    expect(fingerprintOf('jvmMentioningCrashed')).toBe(fingerprintOf('jvmOtherType'));
    expect(fingerprintOf('jvmMentioningIncident')).toBe(fingerprintOf('jvmOtherType'));
  });

  it('keeps the stored fingerprint over the computed one', () => {
    expect(fingerprintOf('stored')).toBe('ingest-fingerprint');
  });
});

describe('IOS_REPORT_OS_VERSION_RULE', () => {
  const osVersionOf = (stacktrace: string) =>
    stacktrace.replace(
      new RegExp(
        IOS_REPORT_OS_VERSION_RULE.pattern,
        `g${crashFrameRuleFlags(IOS_REPORT_OS_VERSION_RULE)}`
      ),
      IOS_REPORT_OS_VERSION_RULE.replacement
    );

  it("reads the version of an iOS report's OS Version line", () => {
    expect(osVersionOf(CRASH_FINGERPRINT_CASES.iosLaunchA.stacktrace)).toBe('17.6.1');
  });

  it('is empty for a report without an OS Version line', () => {
    expect(osVersionOf(CRASH_FINGERPRINT_CASES.iosHeaderOnlyA.stacktrace)).toBe('');
  });
});

describe('IOS_REPORT_RELEASE_RULE', () => {
  const releaseOf = (stacktrace: string) =>
    stacktrace.replace(
      new RegExp(
        IOS_REPORT_RELEASE_RULE.pattern,
        `g${crashFrameRuleFlags(IOS_REPORT_RELEASE_RULE)}`
      ),
      IOS_REPORT_RELEASE_RULE.replacement
    );

  it("reads the release of an iOS report's Version line, not its OS Version line", () => {
    expect(releaseOf(CRASH_FINGERPRINT_CASES.iosLaunchA.stacktrace)).toBe('8.5.0');
  });

  it('is empty for a report without a Version line', () => {
    expect(releaseOf('Incident Identifier: X\nOS Version: iPhone OS 17.6\nThread 0 Crashed:')).toBe(
      ''
    );
  });
});

describe('crashFingerprint', () => {
  const printed = esql`FROM logs`.pipe`EVAL fingerprint = ${crashFingerprint()}`.print('basic');

  it('prefers the stored fingerprint', () => {
    expect(printed).toContain('COALESCE(`attributes.elastic.error.grouping_key`, SHA256(');
  });

  it('reads JavaScript errors from their message and other crashes from their stack trace', () => {
    expect(printed).toContain(
      '`attributes.exception.type` LIKE "*JavascriptException" OR `attributes.elastic.exception.source` == "javascript"'
    );
    expect(printed).toContain('REPLACE(`attributes.exception.message`, "(?s)\\\\n.*", "")');
    expect(printed).toContain('`attributes.exception.stacktrace` LIKE "Incident Identifier:*"');
  });

  it('passes a rule its flags inline, as Java takes them', () => {
    expect(printed).toContain('"(?m)^([ \\\\t]*(?:Caused by|Suppressed): [^:\\\\n]+):.*$", "$1"');
  });
});
