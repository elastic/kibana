/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  processStrategy,
  buildAlertTimelineString,
  buildProcessTimelineString,
} from './process_strategy';

describe('processStrategy', () => {
  describe('match', () => {
    it('always returns true (fallback strategy)', () => {
      expect(processStrategy.match({})).toBe(true);
      expect(processStrategy.match({ event: { category: ['process'] } })).toBe(true);
    });
  });

  describe('buildAlertTimelineString', () => {
    it('generates a Timeline-like string similar to the alert row renderer', () => {
      const text = buildAlertTimelineString({
        event: { category: ['process'] },
        process: { name: ['bash'], parent: { name: ['bash'] } },
        user: { name: ['patrykkopycinski'] },
        host: { name: ['patryk-defend-367602-1'] },
        kibana: {
          alert: {
            severity: ['high'],
            rule: { name: ['Potential Reverse Shell Activity via Terminal'] },
          },
        },
      });

      expect(text).toBe(
        'process event with process bash, parent process bash, by patrykkopycinski on patryk-defend-367602-1 created high alert Potential Reverse Shell Activity via Terminal.'
      );
    });

    it('does not render "with" when none of the with-fields exist', () => {
      const text = buildAlertTimelineString({
        event: { category: ['process'] },
        user: { name: ['alice'] },
        host: { name: ['host-1'] },
        kibana: { alert: { severity: ['low'], rule: { name: ['rule-1'] } } },
      });

      expect(text).toBe('process event by alice on host-1 created low alert rule-1.');
    });
  });

  describe('buildProcessTimelineString', () => {
    it('generates a Timeline-like string similar to the system/endpoint process renderer', () => {
      const text = buildProcessTimelineString({
        event: { action: ['fork'], outcome: ['unknown'] },
        user: { name: ['patrykkopycinski'] },
        host: { name: ['patryk-defend-367602-1'] },
        process: {
          working_directory: ['/home/patrykkopycinski'],
          name: ['bash'],
          pid: [122765],
          args: ['bash', '-c', 'echo', 'done'],
          exit_code: [1],
          parent: { name: ['bash'], pid: [122759] },
          ppid: [122759],
          hash: {
            sha256: ['59474588a312b6b6e73e5a42a59bf71e62b55416b6c9d5e4a6e1c630c2a9ecd4'],
          },
        },
      });

      expect(text).toBe(
        'patrykkopycinski@patryk-defend-367602-1 in /home/patrykkopycinski forked process bash (122765) bash -c echo done with exit code 1 via parent process bash (122759) (122759) with result unknown 59474588a312b6b6e73e5a42a59bf71e62b55416b6c9d5e4a6e1c630c2a9ecd4'
      );
    });
  });

  describe('build (combined)', () => {
    it('returns alert + process segments when both are available', () => {
      const text = processStrategy.build({
        event: { category: ['process'], action: ['fork'], outcome: ['unknown'] },
        user: { name: ['patrykkopycinski'] },
        host: { name: ['patryk-defend-367602-1'] },
        process: { name: ['bash'], parent: { name: ['bash'] }, pid: [122765] },
        kibana: {
          alert: {
            severity: ['high'],
            rule: { name: ['Potential Reverse Shell Activity via Terminal'] },
          },
        },
      });

      expect(text).toBe(
        'process event with process bash, parent process bash, by patrykkopycinski on patryk-defend-367602-1 created high alert Potential Reverse Shell Activity via Terminal. ' +
          'patrykkopycinski@patryk-defend-367602-1 forked process bash (122765) via parent process bash with result unknown'
      );
    });
  });
});
