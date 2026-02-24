/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface OsqueryPackQuery {
  id: string;
  title: string;
  description: string;
  query: string;
}

/**
 * A small osquery query pack for triaging this lab’s activity.
 *
 * Notes:
 * - These are intentionally generic and safe.
 * - They assume Linux (Ubuntu) endpoints.
 */
export const REF7707_LAB_OSQUERY_PACK: OsqueryPackQuery[] = [
  {
    id: 'proc_recent_shells',
    title: 'Recent shell processes',
    description: 'Look for short-lived shells and suspicious command lines (curl/dig).',
    query:
      "SELECT pid, parent, start_time, name, path, cmdline FROM processes WHERE name IN ('bash','sh','dash') ORDER BY start_time DESC LIMIT 200;",
  },
  {
    id: 'proc_curl_dig',
    title: 'curl/dig processes',
    description: 'Identify tooling that performed the domain lookups and downloads.',
    query:
      "SELECT pid, parent, start_time, name, path, cmdline FROM processes WHERE name IN ('curl','dig','wget') ORDER BY start_time DESC LIMIT 200;",
  },
  {
    id: 'net_sockets',
    title: 'Open sockets by process',
    description: 'Snapshot of active sockets (best effort; depends on osquery permissions).',
    query:
      'SELECT pid, local_address, local_port, remote_address, remote_port, state FROM process_open_sockets LIMIT 500;',
  },
  {
    id: 'systemd_service_ref7707',
    title: 'REF7707 demo systemd unit',
    description: 'Confirm persistence-ish unit exists.',
    query:
      "SELECT name, description, source, status, pid, user FROM systemd_units WHERE name = 'ref7707-demo.service';",
  },
  {
    id: 'cron_persistence',
    title: 'Cron jobs',
    description: 'Check for persistence via cron (should be empty for this lab by default).',
    query: 'SELECT * FROM crontab LIMIT 200;',
  },
  {
    id: 'file_triage_ref7707',
    title: 'Staged REF7707 lab files',
    description: 'Collect metadata + hashes for staged files.',
    query:
      "SELECT path, directory, filename, uid, gid, mode, size, mtime, ctime, sha256 FROM file WHERE path IN ('/var/tmp/ref7707/fontdrvhost.exe','/var/tmp/ref7707/config.ini','/var/tmp/ref7707/wmsetup.log','/var/tmp/ref7707/persist.log') LIMIT 50;",
  },
  {
    id: 'auth_recent_logins',
    title: 'Recent logins (best effort)',
    description: 'Useful when SSH lateral-ish is enabled (depends on distro/log config).',
    query: 'SELECT * FROM last LIMIT 50;',
  },
];
