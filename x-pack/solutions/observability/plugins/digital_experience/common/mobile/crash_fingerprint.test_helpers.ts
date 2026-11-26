/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import {
  CRASH_FRAME_RULES,
  IOS_REPORT_MARKER,
  JAVASCRIPT_EXCEPTION_SUFFIX,
  crashFrameRuleFlags,
  type CrashFrameRule,
  type CrashKind,
} from './crash_fingerprint';

export interface CrashFields {
  type?: string;
  message?: string;
  stacktrace?: string;
  storedFingerprint?: string;
}

const applyRules = (input: string, kind: CrashKind): string =>
  CRASH_FRAME_RULES[kind].reduce(
    (text: string, rule: CrashFrameRule) =>
      text.replace(new RegExp(rule.pattern, `g${crashFrameRuleFlags(rule)}`), rule.replacement),
    input
  );

/** Whether `isIosReport` holds for a crash, computed in JavaScript. */
export const isIosReportOf = ({ stacktrace }: CrashFields): boolean =>
  stacktrace?.startsWith(IOS_REPORT_MARKER) ?? false;

/** The frames `crashFrames` computes in ES|QL, computed in JavaScript from the same rules. */
export const crashFramesOf = ({ type, message, stacktrace }: CrashFields): string | null => {
  if (type?.endsWith(JAVASCRIPT_EXCEPTION_SUFFIX)) {
    return message === undefined ? null : applyRules(message, 'javascript');
  }
  if (stacktrace === undefined) {
    return null;
  }
  return applyRules(stacktrace, isIosReportOf({ stacktrace }) ? 'ios' : 'jvm');
};

/** The fingerprint `crashFingerprint` computes in ES|QL, computed in JavaScript. */
export const crashFingerprintOf = (crash: CrashFields): string =>
  crash.storedFingerprint ??
  createHash('sha256')
    .update(`${crash.type ?? ''}|${crashFramesOf(crash) ?? ''}`)
    .digest('hex');

const iosReport = ({
  incident,
  slide,
  lastExceptionBacktrace = false,
}: {
  incident: string;
  slide: number;
  lastExceptionBacktrace?: boolean;
}): string => {
  const address = (base: number, offset: number) =>
    `0x${(base + slide + offset).toString(16).padStart(16, '0')} 0x${(base + slide).toString(16)}`;
  return [
    `Incident Identifier: ${incident}`,
    'Hardware Model:      iPhone13,2',
    `Path:            /private/var/containers/Bundle/Application/${incident}/RideIos.app/RideIos`,
    'Version:         8.5.0 (850)',
    '',
    'OS Version:      iPhone OS 17.6.1 (21G93)',
    '',
    'Exception Type:  SIGSEGV',
    'Crashed Thread:  0',
    '',
    ...(lastExceptionBacktrace
      ? [
          'Last Exception Backtrace:',
          `0   CoreFoundation                      ${address(0x19d208000, 233480)} + 233480`,
          `1   RideIos                             ${address(0x1039fc000, 40081848)} + 40081848`,
          '',
        ]
      : []),
    'Thread 0 Crashed:',
    `0   libsystem_kernel.dylib              ${address(0x1eab64000, 198940)} + 198940`,
    `1   RideIos                             ${address(0x1039fc000, 14587904)} + 14587904`,
    '',
    'Thread 1:',
    `0   libsystem_kernel.dylib              ${address(0x1eab64000, 4084)} + 4084`,
    '',
    'Binary Images:',
    `0x${(0x1039fc000 + slide).toString(
      16
    )} - 0x106a7bfff RideIos arm64 <${incident}> /private/var/RideIos`,
  ].join('\n');
};

/** An iOS report whose frames are symbolicated: one address, then the symbol and its offset. */
const symbolicatedIosReport = (slide: number): string => {
  const address = (base: number) => `0x${(base + slide).toString(16).padStart(16, '0')}`;
  return [
    `Incident Identifier: ${slide
      .toString(16)
      .toUpperCase()
      .padStart(8, '0')}-0000-0000-0000-000000000000`,
    'Version:         8.5.0 (850)',
    '',
    'Last Exception Backtrace:',
    `0   CoreFoundation                      ${address(0x1803f4d88)} __exceptionPreprocess + 164`,
    `1   RideIos                             ${address(
      0x1003a2b10
    )} RideViewController.start() + 88`,
    '',
    'Thread 0 Crashed:',
    `0   libsystem_kernel.dylib              ${address(0x1eab9a91c)} __pthread_kill + 8`,
  ].join('\n');
};

const jvmTrace = (type: string, message: string, line: number): string =>
  [
    `${type}: ${message}`,
    `\tat com.example.app.ui.MainActivity.onResume(MainActivity.kt:${line})`,
    '\tat android.os.Handler.handleCallback(Handler.java:958)',
  ].join('\n');

/** An Android crash whose cause's message has an object hash, and that shares frames with it. */
const jvmTraceWithCause = ({ fragment, shared }: { fragment: string; shared: number }): string =>
  [
    'java.lang.RuntimeException: Unable to resume activity {com.example.app/MainActivity}',
    '\tat android.app.ActivityThread.performResumeActivity(ActivityThread.java:5005)',
    '\tat android.os.Handler.handleCallback(Handler.java:958)',
    `Caused by: java.lang.IllegalStateException: Fragment HomeFragment{${fragment}} not attached`,
    '\tat androidx.fragment.app.Fragment.requireContext(Fragment.java:972)',
    '\tat com.example.app.ui.HomeFragment.onResume(HomeFragment.kt:41)',
    `\t... ${shared} more`,
    '\tSuppressed: java.io.IOException: Stream closed at offset 512',
    '\t\tat java.io.BufferedInputStream.read(BufferedInputStream.java:351)',
  ].join('\n');

const javascriptCrash = (message: string): CrashFields => ({
  type: 'com.facebook.react.common.JavascriptException',
  message,
  stacktrace: [
    `com.facebook.react.common.JavascriptException: ${message}`,
    '\tat com.facebook.react.modules.core.ExceptionsManagerModule.reportException(ExceptionsManagerModule.java:65)',
  ].join('\n'),
});

/** Crashes that must share a fingerprint, or not, in ES|QL and at ingest alike. */
export const CRASH_FINGERPRINT_CASES = {
  jvmLine88: {
    type: 'java.lang.NullPointerException',
    stacktrace: jvmTrace('java.lang.NullPointerException', 'TrackRecorder is null', 88),
  },
  jvmLine91: {
    type: 'java.lang.NullPointerException',
    stacktrace: jvmTrace('java.lang.NullPointerException', 'TrackRecorder is null', 91),
  },
  jvmOtherType: {
    type: 'java.lang.IllegalStateException',
    stacktrace: jvmTrace('java.lang.NullPointerException', 'TrackRecorder is null', 88),
  },
  jvmCauseA: {
    type: 'java.lang.RuntimeException',
    stacktrace: jvmTraceWithCause({ fragment: '9f2c1d', shared: 12 }),
  },
  jvmCauseB: {
    type: 'java.lang.RuntimeException',
    stacktrace: jvmTraceWithCause({ fragment: '4b77e0', shared: 14 }),
  },
  iosLaunchA: {
    type: 'SIGSEGV',
    stacktrace: iosReport({ incident: '45090074-A604-C25B-087F-5EDD13FDEECB', slide: 0x4000 }),
  },
  iosLaunchB: {
    type: 'SIGSEGV',
    stacktrace: iosReport({ incident: '9F1C2B7E-0D3A-4E55-8C21-77A0B3D4E6F1', slide: 0x1f8000 }),
  },
  iosExceptionA: {
    type: 'SIGABRT',
    stacktrace: iosReport({
      incident: '11111111-2222-3333-4444-555555555555',
      slide: 0x8000,
      lastExceptionBacktrace: true,
    }),
  },
  iosExceptionB: {
    type: 'SIGABRT',
    stacktrace: iosReport({
      incident: '66666666-7777-8888-9999-AAAAAAAAAAAA',
      slide: 0x24000,
      lastExceptionBacktrace: true,
    }),
  },
  // Line breaks as some exporters write them, and reports cut before their crashed thread.
  iosCrlf: {
    type: 'SIGSEGV',
    stacktrace: iosReport({ incident: '0D8B5C1E-7F42-4A9B-B3C6-2E1D9F0A4B7C', slide: 0x9c000 })
      .split('\n')
      .join('\r\n'),
  },
  iosHeaderOnlyA: {
    type: 'SIGKILL',
    stacktrace:
      'Incident Identifier: 5A1E2B3C-0000-0000-0000-000000000001\nVersion:         8.5.0 (850)',
  },
  iosHeaderOnlyB: {
    type: 'SIGKILL',
    stacktrace:
      'Incident Identifier: 7C9D8E6F-0000-0000-0000-000000000002\nVersion:         8.5.0 (850)',
  },
  iosSymbolicatedA: {
    type: 'NSInvalidArgumentException',
    stacktrace: symbolicatedIosReport(0x4000),
  },
  iosSymbolicatedB: {
    type: 'NSInvalidArgumentException',
    stacktrace: symbolicatedIosReport(0x2c8000),
  },
  javascriptIndex5: javascriptCrash('TypeError: index 5 out of range at 0x7f3a, js engine: hermes'),
  javascriptIndex7: javascriptCrash('TypeError: index 7 out of range at 0x9b10, js engine: hermes'),
  javascriptIban: javascriptCrash(
    "TypeError: undefined is not an object (evaluating 'payee.iban')"
  ),
  javascriptMap: javascriptCrash(
    "TypeError: Cannot read property 'map' of undefined, js engine: hermes"
  ),
  // Errors that mention an iOS report's lines: still read as what they are, not as iOS reports.
  jvmMentioningCrashed: {
    type: 'java.lang.IllegalStateException',
    stacktrace: jvmTrace('java.lang.IllegalStateException', 'Thread 0 Crashed: in native code', 88),
  },
  jvmMentioningIncident: {
    type: 'java.lang.IllegalStateException',
    stacktrace: jvmTrace(
      'java.lang.IllegalStateException',
      'Incident Identifier: 45090074-A604-C25B-087F-5EDD13FDEECB',
      88
    ),
  },
  javascriptMentioningCrashed: javascriptCrash('Error: Thread 0 Crashed: in a native module'),
  noStacktrace: { type: 'SIGKILL' },
  stored: { ...javascriptCrash('TypeError: anything'), storedFingerprint: 'ingest-fingerprint' },
} satisfies Record<string, CrashFields>;

/** The fingerprints ES|QL computes for `CRASH_FINGERPRINT_CASES`, checked against Elasticsearch. */
export const EXPECTED_CRASH_FINGERPRINTS: Record<keyof typeof CRASH_FINGERPRINT_CASES, string> = {
  jvmLine88: '1335db39554a30b03c0078c2c345bc38866a546bbb2aa0ea306384f6d3069fd4',
  jvmLine91: '1335db39554a30b03c0078c2c345bc38866a546bbb2aa0ea306384f6d3069fd4',
  jvmOtherType: '7a04469118d128cdbc214032c282877dad105bba1ed21e165fdaf7dbb4d6884c',
  jvmCauseA: '544621df180c7f6126bcfdbfd1ac73ad3d7ec84559bbb0941ac9bb0695861aa7',
  jvmCauseB: '544621df180c7f6126bcfdbfd1ac73ad3d7ec84559bbb0941ac9bb0695861aa7',
  iosLaunchA: '2ff3f68c306a93625ec7cfe1d2db4587704a34b76bbfa9ed31afd8f69e8a0014',
  iosLaunchB: '2ff3f68c306a93625ec7cfe1d2db4587704a34b76bbfa9ed31afd8f69e8a0014',
  iosExceptionA: 'b514cfbd8ddc65d16c3b79fb02481d43247ac3fb6860d3ecdb3058af88ecf709',
  iosExceptionB: 'b514cfbd8ddc65d16c3b79fb02481d43247ac3fb6860d3ecdb3058af88ecf709',
  iosCrlf: '2ff3f68c306a93625ec7cfe1d2db4587704a34b76bbfa9ed31afd8f69e8a0014',
  iosHeaderOnlyA: '3005496ec4d1df64b0b8dd7156f3dad8f0620a373c2670c1a7f5ac1888d1eaed',
  iosHeaderOnlyB: '3005496ec4d1df64b0b8dd7156f3dad8f0620a373c2670c1a7f5ac1888d1eaed',
  iosSymbolicatedA: 'f5a8725a56365c22ec6ee0aa21420567f609035ed6c378035cf881a4cf2c737b',
  iosSymbolicatedB: 'f5a8725a56365c22ec6ee0aa21420567f609035ed6c378035cf881a4cf2c737b',
  javascriptIndex5: '6fa897602de144d6484f9c78f7c7b442366dc466558d05a95c0c33b4d33190c2',
  javascriptIndex7: '6fa897602de144d6484f9c78f7c7b442366dc466558d05a95c0c33b4d33190c2',
  javascriptIban: '9cd1dde79ac088d104d51199ed83de21adee4505e4618b2df6e9221aa9bea494',
  javascriptMap: '5637ee732bc0a49b4e67e4e8fc8ce33e76ffdf371129843438e41c46229f72fb',
  jvmMentioningCrashed: '7a04469118d128cdbc214032c282877dad105bba1ed21e165fdaf7dbb4d6884c',
  jvmMentioningIncident: '7a04469118d128cdbc214032c282877dad105bba1ed21e165fdaf7dbb4d6884c',
  javascriptMentioningCrashed: '911c7fe74e02926a1dd689a73b2dd2635fad699bb11aa8c2af2fe929d4693390',
  noStacktrace: '3005496ec4d1df64b0b8dd7156f3dad8f0620a373c2670c1a7f5ac1888d1eaed',
  stored: 'ingest-fingerprint',
};
