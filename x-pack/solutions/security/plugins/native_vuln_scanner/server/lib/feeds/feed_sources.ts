/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CANONICAL_OVAL_BASE_URL = 'https://security-metadata.canonical.com/oval/';
export const REDHAT_OVAL_BASE_URL = 'https://security.access.redhat.com/data/oval/v2/';
export const REDHAT_CSAF_BASE_URL = 'https://security.access.redhat.com/data/csaf/v2/advisories/';
export const MSRC_CVRF_BASE_URL = 'https://api.msrc.microsoft.com/cvrf/v3.0/';
export const KEV_URL =
  'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

export interface FeedSource {
  name: string;
  /** Vendor URL with `<placeholders>`; the mirror serves it at `<feedMirrorUrl>/<host>/<path>`. */
  urlPattern: string;
}

/** Every vendor URL the scanner downloads, checked by the drift test. The README is hand-written. */
export const FEED_SOURCES: readonly FeedSource[] = [
  {
    name: 'Ubuntu OVAL',
    urlPattern: `${CANONICAL_OVAL_BASE_URL}com.ubuntu.<codename>.cve.oval.xml.bz2`,
  },
  {
    name: 'RHEL 8 and 9 OVAL',
    urlPattern: `${REDHAT_OVAL_BASE_URL}RHEL<major>/rhel-<major>.oval.xml.bz2`,
  },
  {
    name: 'RHEL 8 and 9 OVAL including unpatched',
    urlPattern: `${REDHAT_OVAL_BASE_URL}RHEL<major>/rhel-<major>-including-unpatched.oval.xml.bz2`,
  },
  { name: 'RHEL 10+ CSAF archive name', urlPattern: `${REDHAT_CSAF_BASE_URL}archive_latest.txt` },
  { name: 'RHEL 10+ CSAF change list', urlPattern: `${REDHAT_CSAF_BASE_URL}changes.csv` },
  { name: 'RHEL 10+ CSAF archive', urlPattern: `${REDHAT_CSAF_BASE_URL}<archive_latest.txt>` },
  {
    name: 'RHEL 10+ CSAF advisories newer than the archive (listed in changes.csv)',
    urlPattern: `${REDHAT_CSAF_BASE_URL}<year>/<advisory>.json`,
  },
  { name: 'Microsoft MSRC CVRF update index', urlPattern: `${MSRC_CVRF_BASE_URL}updates` },
  {
    name: 'Microsoft MSRC CVRF monthly document',
    urlPattern: `${MSRC_CVRF_BASE_URL}cvrf/<YYYY-Mon>`,
  },
  { name: 'CISA Known Exploited Vulnerabilities', urlPattern: KEV_URL },
];
