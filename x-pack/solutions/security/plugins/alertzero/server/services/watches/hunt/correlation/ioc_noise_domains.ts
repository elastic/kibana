/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * IOC denylist for correlation anchoring. Copied from mustard's
 * `services/data/ioc_noise_domains.ts` — full denylist in follow-up when
 * this moves to a shared package. No cross-plugin import allowed (buildout.md:31).
 */

interface NoiseDomainEntry {
  readonly domain: string;
  readonly rationale: string;
  readonly added: string;
  readonly source: string;
}

export const IOC_NOISE_DOMAIN_LIST: readonly NoiseDomainEntry[] = [
  { domain: 'elastic.co', rationale: 'Vendor reference, never C2', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'urlscan.io', rationale: 'URL scanning service, never IOC target', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'virustotal.com', rationale: 'AV/sandbox platform, never IOC target', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'shodan.io', rationale: 'Internet scanner, never adversary infra', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'any.run', rationale: 'Malware sandbox, never IOC', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'app.any.run', rationale: 'Malware sandbox subdomain', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'hybrid-analysis.com', rationale: 'Malware sandbox', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'joesandbox.com', rationale: 'Malware sandbox', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'abuse.ch', rationale: 'Threat tracker network', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'bazaar.abuse.ch', rationale: 'MalwareBazaar', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'malwarebazaar.abuse.ch', rationale: 'MalwareBazaar alternate', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'feodotracker.abuse.ch', rationale: 'Feodo tracker', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'urlhaus.abuse.ch', rationale: 'URLhaus', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'threatfox.abuse.ch', rationale: 'ThreatFox', added: '2026-06-08', source: 'corpus-review' },
  { domain: 'example.com', rationale: 'RFC-reserved placeholder', added: '2026-06-08', source: 'manual' },
  { domain: 'localhost', rationale: 'Loopback hostname', added: '2026-06-08', source: 'manual' },
  { domain: 'twitter.com', rationale: 'Social media reference', added: '2026-06-08', source: 'manual' },
  { domain: 'mitre.org', rationale: 'MITRE framework citation', added: '2026-06-08', source: 'manual' },
  { domain: 'attack.mitre.org', rationale: 'MITRE ATT&CK URL', added: '2026-06-08', source: 'manual' },
  { domain: 'nvd.nist.gov', rationale: 'NIST NVD CVE database', added: '2026-06-08', source: 'manual' },
  { domain: 'cve.mitre.org', rationale: 'CVE reference database', added: '2026-06-08', source: 'manual' },
  { domain: 'packages.npm.org', rationale: 'npm CDN/packages host', added: '2026-06-25', source: 'eval-2026-06-23' },
  { domain: 'npmjs.org', rationale: 'npm organization domain', added: '2026-06-25', source: 'eval-2026-06-23' },
];

export const IOC_NOISE_DOMAINS: ReadonlySet<string> = new Set(
  IOC_NOISE_DOMAIN_LIST.map((entry) => entry.domain.toLowerCase())
);
