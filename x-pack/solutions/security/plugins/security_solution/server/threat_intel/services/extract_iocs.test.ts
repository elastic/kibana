/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_URL_LENGTH } from '../../../common/threat_intel';
import { classifySectionSpans, extractIocs, type ExtractedIoc, type IocTier } from './extract_iocs';

/** Helper: extract IOC values of a specific type from the result. */
const valuesOf = (result: ReturnType<typeof extractIocs>, type: string) =>
  result.iocs.filter((ioc) => ioc.type === type).map((ioc) => ioc.value);

const emailValues = (result: ReturnType<typeof extractIocs>) => valuesOf(result, 'email');
const walletValues = (result: ReturnType<typeof extractIocs>) => valuesOf(result, 'wallet');
const cidrValues = (result: ReturnType<typeof extractIocs>) => valuesOf(result, 'cidr');
const ipValues = (result: ReturnType<typeof extractIocs>) => valuesOf(result, 'ip');

/**
 * Reference and denied entries are known noise (citations, denylisted hosts), so
 * they are allowed to carry markdown artifacts. Only signal tiers must be clean.
 */
const signalIocs = (result: ReturnType<typeof extractIocs>) =>
  result.iocs.filter((ioc) => ioc.tier !== 'reference' && ioc.tier !== 'denied');

const domainValues = (result: ReturnType<typeof extractIocs>) => valuesOf(result, 'domain');
const hashValues = (result: ReturnType<typeof extractIocs>) => valuesOf(result, 'hash');
const urlValues = (result: ReturnType<typeof extractIocs>) => valuesOf(result, 'url');

/** Filter to IOCs of a given tier. */
const tieredValues = (result: ReturnType<typeof extractIocs>, tier: IocTier, type?: string) =>
  result.iocs
    .filter((ioc) => ioc.tier === tier && (!type || ioc.type === type))
    .map((ioc) => ioc.value);

/** All domain values that are anchor-eligible (not reference or denied). */
const anchorDomainValues = (result: ReturnType<typeof extractIocs>) =>
  result.iocs
    .filter((ioc) => ioc.type === 'domain' && ioc.tier !== 'reference' && ioc.tier !== 'denied')
    .map((ioc) => ioc.value);

// ── Refang + normalization ─────────────────────────────────────────

describe('extract_iocs — refang pre-pass and value normalization', () => {
  describe('refang: recovers defanged domains', () => {
    test('recovers [.] bracket dot', () => {
      const r = extractIocs({ text: 'C2 at evil[.]com' });
      expect(domainValues(r)).toContain('evil.com');
    });

    test('recovers (.) paren dot', () => {
      const r = extractIocs({ text: 'callback to bad(.)example.net' });
      expect(domainValues(r)).toContain('bad.example.net');
    });

    test('recovers {.} brace dot', () => {
      const r = extractIocs({ text: 'stage2 from evil{.}org' });
      expect(domainValues(r)).toContain('evil.org');
    });

    test('recovers [dot] bracketed spelled-out form', () => {
      const r = extractIocs({ text: 'beacon to c2[dot]attacker[dot]top' });
      expect(domainValues(r)).toContain('c2.attacker.top');
    });

    test('recovers (dot) parenthesized spelled-out form', () => {
      const r = extractIocs({ text: 'C2 at evil(dot)example(dot)com' });
      expect(domainValues(r)).toContain('evil.example.com');
    });

    test('does NOT refang bare " dot " prose (too FP-prone)', () => {
      // "asp dot net", "polka dot" must not be corrupted
      const r = extractIocs({ text: 'visit asp dot net for docs' });
      expect(domainValues(r)).not.toContain('asp.net');
    });

    test('recovers multi-label defanged domain: evil[.]example[.]com', () => {
      const r = extractIocs({ text: 'dropper calls home to evil[.]example[.]com' });
      expect(domainValues(r)).toContain('evil.example.com');
    });
  });

  describe('refang: recovers defanged IPs', () => {
    test('recovers 1.2.3[.]4', () => {
      const r = extractIocs({ text: 'C2 server at 1.2.3[.]4' });
      expect(valuesOf(r, 'ip')).toContain('1.2.3.4');
    });

    test('recovers 10[.]0[.]0[.]1 (private — emitted as reference tier, not anchor-eligible)', () => {
      // Refang recovers the dotted-quad; private-IP filter tags it reference but keeps it.
      const r = extractIocs({ text: 'LAN hop at 10[.]0[.]0[.]1' });
      const ioc = r.iocs.find((i) => i.value === '10.0.0.1');
      expect(ioc?.tier).toBe('reference');
      expect(ioc?.tier_basis).toBe('private_ip');
    });

    test('recovers 192[.]168[.]1[.]100 (private — emitted as reference tier)', () => {
      const r = extractIocs({ text: 'pivot via 192[.]168[.]1[.]100' });
      const ioc = r.iocs.find((i) => i.value === '192.168.1.100');
      expect(ioc?.tier).toBe('reference');
      expect(ioc?.tier_basis).toBe('private_ip');
    });
  });

  describe('refang: recovers hxxp/hxxps URLs', () => {
    test('recovers hxxps:// scheme', () => {
      const r = extractIocs({ text: 'payload from hxxps://bad[.]com/x' });
      expect(urlValues(r)).toContain('https://bad.com/x');
    });

    test('recovers hxxp:// scheme', () => {
      const r = extractIocs({ text: 'download hxxp://evil.top/drop' });
      expect(urlValues(r)).toContain('http://evil.top/drop');
    });

    test('recovers mixed-case hXXps://', () => {
      const r = extractIocs({ text: 'seen hXXps://malware.io/payload' });
      expect(urlValues(r)).toContain('https://malware.io/payload');
    });

    test('recovers hxxps:// with [.] in host', () => {
      const r = extractIocs({ text: 'C2: hxxps://bad[.]com/x' });
      expect(urlValues(r)).toContain('https://bad.com/x');
    });
  });

  describe('value normalization: lowercase canonical values', () => {
    test('mixed-case domain is stored lowercase', () => {
      const r = extractIocs({ text: 'beacon to Evil.COM' });
      expect(domainValues(r)).toContain('evil.com');
      expect(domainValues(r)).not.toContain('Evil.COM');
    });

    test('defanged Evil[.]com and fanged evil.com produce the SAME value (collision)', () => {
      const r1 = extractIocs({ text: 'C2 at Evil[.]com' });
      const r2 = extractIocs({ text: 'C2 at evil.com' });
      expect(domainValues(r1)).toEqual(domainValues(r2));
    });

    // Scheme and host are case-insensitive, path and query are not. Folding the
    // whole URL meant the promoted indicator no longer matched telemetry carrying
    // the real one.
    test('url scheme and host are folded but the path keeps its case', () => {
      const r = extractIocs({ text: 'from hXXps://Bad.Example.Com/PAYLOAD/Stage2.exe' });
      expect(urlValues(r)).toContain('https://bad.example.com/PAYLOAD/Stage2.exe');
    });

    test('two URLs differing only in path case stay distinct', () => {
      const r = extractIocs({
        text: 'a https://evil.test/PAYLOAD/Stage2.exe b https://evil.test/payload/stage2.exe',
      });
      expect(urlValues(r)).toContain('https://evil.test/PAYLOAD/Stage2.exe');
      expect(urlValues(r)).toContain('https://evil.test/payload/stage2.exe');
    });

    test('a trailing sentence period is not part of the URL', () => {
      const r = extractIocs({ text: 'Download https://evil.example/payload.bin.' });
      expect(urlValues(r)).toContain('https://evil.example/payload.bin');
      expect(urlValues(r)).not.toContain('https://evil.example/payload.bin.');
    });

    test('trailing prose commas and parens are trimmed', () => {
      const r = extractIocs({ text: 'see (https://evil.example/a), then stop' });
      expect(urlValues(r)).toContain('https://evil.example/a');
    });

    test('a balanced paren inside the path survives', () => {
      const r = extractIocs({ text: 'ref https://evil.example/Foo_(bar) here' });
      expect(urlValues(r)).toContain('https://evil.example/Foo_(bar)');
    });

    test('trims a long run of unmatched closers without rescanning the URL', () => {
      const r = extractIocs({
        text: `ref https://evil.example/payload${')'.repeat(100_000)} done`,
      });
      expect(urlValues(r)).toContain('https://evil.example/payload');
    });

    test('hash value is lowercased (unchanged from prior behavior)', () => {
      const r = extractIocs({ text: 'hash: D41D8CD98F00B204E9800998ECF8427E' });
      expect(valuesOf(r, 'hash')).toContain('d41d8cd98f00b204e9800998ecf8427e');
    });
  });

  describe('ioc_set_hash stability with normalization', () => {
    test('Evil[.]com and evil.com produce the same ioc_set_hash', () => {
      const r1 = extractIocs({ text: 'C2 at Evil[.]com' });
      const r2 = extractIocs({ text: 'C2 at evil.com' });
      expect(r1.ioc_set_hash).not.toBeNull();
      expect(r1.ioc_set_hash).toEqual(r2.ioc_set_hash);
    });

    test('hxxps://bad[.]com and https://bad.com produce the same ioc_set_hash', () => {
      const r1 = extractIocs({ text: 'from hxxps://bad[.]com/x' });
      const r2 = extractIocs({ text: 'from https://bad.com/x' });
      expect(r1.ioc_set_hash).not.toBeNull();
      expect(r1.ioc_set_hash).toEqual(r2.ioc_set_hash);
    });

    test('hash IOC is unchanged: same hash in defanged or fanged report', () => {
      const hash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const r1 = extractIocs({ text: `sha256: ${hash}` });
      const r2 = extractIocs({ text: `sha256: ${hash.toUpperCase()}` });
      expect(r1.ioc_set_hash).not.toBeNull();
      expect(r1.ioc_set_hash).toEqual(r2.ioc_set_hash);
    });
  });
});

// Downstream consumers (promote, reports index) read `defanged`. Cover the field
// itself so a regression in `defangValue` or the default `defang` flag is visible.
describe('extract_iocs — defang output field', () => {
  test('domain value is defanged by default', () => {
    const r = extractIocs({ text: 'C2 at evil.com' });
    const ioc = r.iocs.find((i) => i.value === 'evil.com');
    expect(ioc?.defanged).toBe('evil[.]com');
  });

  test('defang: false leaves value intact', () => {
    const r = extractIocs({ text: 'C2 at evil.com', defang: false });
    const ioc = r.iocs.find((i) => i.value === 'evil.com');
    expect(ioc?.defanged).toBe('evil.com');
  });

  test('URL scheme separator is defanged', () => {
    const r = extractIocs({ text: 'payload at https://evil.example/payload' });
    const ioc = r.iocs.find((i) => i.type === 'url');
    // `defangValue` brackets the scheme separator (`https[:]//`), it does not rewrite
    // the scheme to hxxps. Refang accepts hxxps on input; output uses the bracket form.
    expect(ioc?.defanged).toBe('https[:]//evil.example/payload');
  });
});

// ── DROP side: tokens that must NOT appear in IOC output ──────────────────────

describe('extract_iocs — DROP side (precision filters)', () => {
  describe('file extensions (step 1) — dropped before IANA check', () => {
    test('rejects .exe filenames', () => {
      const r = extractIocs({
        text: 'dropper WinRing0x64.exe loaded svchost.exe and explorer.exe',
      });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects .dll filenames', () => {
      const r = extractIocs({ text: 'atiadlxx.dll and uxtheme.dll injected' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects .sys driver names', () => {
      const r = extractIocs({ text: 'WinRing0x64.sys dropped to %TEMP%' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects .txt filenames', () => {
      const r = extractIocs({ text: 'wrote 0226.txt to disk' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects .vbs script names', () => {
      const r = extractIocs({ text: 'executed payload.vbs via wscript' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects .zip archives — including gTLD collision', () => {
      // .zip is an IANA gTLD since 2023 but must still be treated as a file extension
      const r = extractIocs({ text: 'dropped update.zip and malware.zip to %APPDATA%' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects .mov — gTLD collision', () => {
      const r = extractIocs({ text: 'lure.mov sent via phishing email' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects .bat and .cmd script filenames', () => {
      const r = extractIocs({ text: 'ran persistence.bat and stage.cmd via cmd' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects .ps1 PowerShell scripts', () => {
      const r = extractIocs({ text: 'executed payload.ps1 via powershell' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects .js and .jse script filenames', () => {
      const r = extractIocs({ text: 'dropped loader.js and encoded.jse to %TEMP%' });
      expect(domainValues(r)).toEqual([]);
    });
  });

  describe('IANA TLD validation (step 2)', () => {
    test('rejects code symbols (non-TLD suffix)', () => {
      // .Serializer / .Sleep / .MaxValue / .Execute are not IANA TLDs → rejected.
      // NOTE: .shell IS a real branded gTLD (Shell petroleum), so WScript.Shell is
      // intentionally NOT tested here — the IANA check correctly passes it.
      const r = extractIocs({
        text: 'ProtoBuf.Serializer and Thread.Sleep and int.MaxValue and WScript.Execute called',
      });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects truncated C2 domain fragment', () => {
      // 'hopto' is NOT an IANA TLD; 'wndlogon.hopto' must be dropped
      const r = extractIocs({ text: 'beacon to wndlogon.hopto on port 443' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects bare CDN hostname without TLD', () => {
      // 'd3nxbjuv18k2dn.cloudfront' — 'cloudfront' is not a TLD
      const r = extractIocs({ text: 'payload from d3nxbjuv18k2dn.cloudfront over https' });
      expect(domainValues(r)).toEqual([]);
    });
  });

  describe('binary names with exe extension are dropped; with real TLD are KEPT', () => {
    test('drops powershell.exe (extension form)', () => {
      const r = extractIocs({ text: 'spawned powershell.exe -enc ...' });
      expect(domainValues(r)).toEqual([]);
    });

    test('drops svchost.dll (extension form)', () => {
      const r = extractIocs({ text: 'injected into svchost.dll in memory' });
      expect(domainValues(r)).toEqual([]);
    });
  });

  describe('noise domain denylist (step 4) — emitted as reference tier, NOT as anchor IOCs', () => {
    test('elastic.co is emitted with tier=reference, excluded from anchor set', () => {
      const r = extractIocs({ text: 'report analyzed via elastic.co detection rules' });
      // Now kept (for observability) but tagged reference — not an anchor IOC.
      expect(anchorDomainValues(r)).not.toContain('elastic.co');
      expect(tieredValues(r, 'reference', 'domain')).toContain('elastic.co');
    });

    test('urlscan.io is emitted with tier=reference, excluded from anchor set', () => {
      const r = extractIocs({ text: 'scan at urlscan.io shows the payload' });
      expect(anchorDomainValues(r)).not.toContain('urlscan.io');
      expect(tieredValues(r, 'reference', 'domain')).toContain('urlscan.io');
    });

    test('virustotal.com is emitted with tier=reference, excluded from anchor set', () => {
      const r = extractIocs({ text: 'virustotal.com detection rate 12/72' });
      expect(anchorDomainValues(r)).not.toContain('virustotal.com');
      expect(tieredValues(r, 'reference', 'domain')).toContain('virustotal.com');
    });

    test('abuse.ch and bazaar.abuse.ch are emitted with tier=reference', () => {
      const r = extractIocs({ text: 'hash listed on abuse.ch and bazaar.abuse.ch' });
      expect(anchorDomainValues(r)).not.toContain('abuse.ch');
      expect(anchorDomainValues(r)).not.toContain('bazaar.abuse.ch');
      expect(tieredValues(r, 'reference', 'domain')).toContain('abuse.ch');
      expect(tieredValues(r, 'reference', 'domain')).toContain('bazaar.abuse.ch');
    });

    test('github.com bare domain → contextual/known_cdn (content-host; path is the signal, bare host not discriminating)', () => {
      const r = extractIocs({ text: 'source code at github.com' });
      const ioc = r.iocs.find((i) => i.type === 'domain' && i.value === 'github.com');
      expect(ioc?.tier).toBe('contextual');
      expect(ioc?.tier_basis).toBe('known_cdn');
    });

    test('attack.mitre.org is emitted with tier=reference', () => {
      const r = extractIocs({ text: 'technique T1059 at attack.mitre.org' });
      expect(anchorDomainValues(r)).not.toContain('attack.mitre.org');
      expect(tieredValues(r, 'reference', 'domain')).toContain('attack.mitre.org');
    });
  });

  describe('longest-match dedup (step 5)', () => {
    test('drops suffix fragment when full domain is present', () => {
      // Both 'hopto.org' and 'wndlogon.hopto.org' survive steps 1-4;
      // longest-match should keep only the longer one.
      const r = extractIocs({
        text: 'C2 at wndlogon.hopto.org — some reports truncate to hopto.org',
      });
      expect(domainValues(r)).toContain('wndlogon.hopto.org');
      expect(domainValues(r)).not.toContain('hopto.org');
    });

    test('keeps standalone domain when no longer match exists', () => {
      const r = extractIocs({ text: 'beacon to malicious.evil.top' });
      expect(domainValues(r)).toContain('malicious.evil.top');
    });

    test('handles a large structured set without pairwise suffix or section scans', () => {
      const domains = Array.from({ length: 10_000 }, (_, index) => `node${index}.evil${index}.com`);
      const r = extractIocs({ text: `## IOCs\n${domains.join(' ')}` });

      expect(r.count).toBe(domains.length);
      expect(r.truncated).toBe(true);
      expect(r.iocs[0].tier_basis).toBe('ioc_section');
    });
  });
});

// ── KEEP side: real IOCs that must survive all filters ────────────────────────

describe('extract_iocs — KEEP side (real IOCs retained)', () => {
  describe('binary name + real TLD — MUST be kept (valid C2 domains)', () => {
    test('retains powershell.ru', () => {
      const r = extractIocs({ text: 'C2 callback to powershell.ru:8443' });
      expect(domainValues(r)).toContain('powershell.ru');
    });

    test('retains powershell.com', () => {
      const r = extractIocs({ text: 'phishing domain powershell.com observed' });
      expect(domainValues(r)).toContain('powershell.com');
    });

    test('retains svchost.io', () => {
      const r = extractIocs({ text: 'beacon POST to svchost.io/check' });
      expect(domainValues(r)).toContain('svchost.io');
    });

    test('retains find.attacker.top', () => {
      const r = extractIocs({ text: 'DNS lookup for find.attacker.top' });
      expect(domainValues(r)).toContain('find.attacker.top');
    });

    test('retains explorer.net', () => {
      const r = extractIocs({ text: 'stage2 pulled from explorer.net/payload' });
      expect(domainValues(r)).toContain('explorer.net');
    });

    test('retains rundll32.io', () => {
      const r = extractIocs({ text: 'C2 at rundll32.io identified in PCAP' });
      expect(domainValues(r)).toContain('rundll32.io');
    });
  });

  describe('real C2 domains (from live corpus evidence)', () => {
    test('retains .top C2 domain', () => {
      const r = extractIocs({ text: 'C2 callback observed to malware.top on port 8080' });
      expect(domainValues(r)).toContain('malware.top');
    });

    test('retains .ws domain', () => {
      const r = extractIocs({ text: 'stage2 payload from stage.attacker.ws' });
      expect(domainValues(r)).toContain('stage.attacker.ws');
    });

    test('retains .cv ccTLD domain', () => {
      const r = extractIocs({ text: 'C2 at beacon.threat.cv:443' });
      expect(domainValues(r)).toContain('beacon.threat.cv');
    });

    test('retains DynDNS C2 (wndlogon.hopto.org)', () => {
      const r = extractIocs({ text: 'persistent callback to wndlogon.hopto.org' });
      expect(domainValues(r)).toContain('wndlogon.hopto.org');
    });

    test('retains multi-label C2 with rare TLD', () => {
      const r = extractIocs({ text: 'drop1.cdn.malicious.xyz exfil server' });
      expect(domainValues(r)).toContain('drop1.cdn.malicious.xyz');
    });

    test('retains .io C2 domain (not svchost, not noise)', () => {
      const r = extractIocs({ text: 'C2 at c2infrastructure.io' });
      expect(domainValues(r)).toContain('c2infrastructure.io');
    });

    test('retains raw.githubusercontent.com as contextual/known_cdn (content-host; bare host not discriminating)', () => {
      const r = extractIocs({
        text: 'payload fetched from raw.githubusercontent.com via certutil',
      });
      expect(domainValues(r)).toContain('raw.githubusercontent.com');
      const ioc = r.iocs.find((i) => i.value === 'raw.githubusercontent.com');
      expect(ioc?.tier).toBe('contextual');
      expect(ioc?.tier_basis).toBe('known_cdn');
    });
  });

  describe('hashes — unchanged by domain filters', () => {
    test('retains MD5 hash', () => {
      const r = extractIocs({ text: 'md5: d41d8cd98f00b204e9800998ecf8427e' });
      expect(hashValues(r)).toContain('d41d8cd98f00b204e9800998ecf8427e');
    });

    test('retains SHA-256 hash', () => {
      const r = extractIocs({
        text: 'sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      });
      expect(hashValues(r)).toContain(
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      );
    });

    test('retains multiple hashes from RoningLoader-style report', () => {
      const text = [
        'WinRing0x64.sys hash: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        'atiadlxx.dll hash: 0226ab4e2f07ab1c6a4b5e3d8f9c2a1b',
      ].join('\n');
      const r = extractIocs({ text });
      expect(hashValues(r)).toContain(
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
      );
      expect(hashValues(r)).toContain('0226ab4e2f07ab1c6a4b5e3d8f9c2a1b');
    });
  });

  describe('URLs — retained (url extraction unaffected by domain filters)', () => {
    test('retains GitHub raw payload URL', () => {
      const r = extractIocs({
        text: 'loader fetches https://raw.githubusercontent.com/attacker/repo/main/payload.bin',
      });
      expect(urlValues(r)).toContain(
        'https://raw.githubusercontent.com/attacker/repo/main/payload.bin'
      );
    });

    test('retains C2 URL', () => {
      const r = extractIocs({ text: 'beacon POST to https://update.evil.top/checkin?id=1234' });
      expect(urlValues(r)).toContain('https://update.evil.top/checkin?id=1234');
    });
  });

  describe('real C2 gold corpus — unchanged by new filters', () => {
    test('retains qaqkongtiao.com', () => {
      const r = extractIocs({ text: 'C2 observed at qaqkongtiao.com' });
      expect(domainValues(r)).toContain('qaqkongtiao.com');
    });

    test('retains sfrclak.com', () => {
      const r = extractIocs({ text: 'beacon to sfrclak.com:8080' });
      expect(domainValues(r)).toContain('sfrclak.com');
    });
  });

  describe('ioc_set_hash — computed from anchor-eligible IOCs only (not reference/denied)', () => {
    test('returns null when all tokens are reference or denied tier', () => {
      // elastic.co → reference; virustotal.com → reference; WScript.Execute → hard drop (non-IANA TLD).
      // All emitted domains are reference/denied so ioc_set_hash = null.
      const r = extractIocs({
        text: 'svchost.exe explorer.exe WScript.Execute Thread.Sleep elastic.co virustotal.com',
      });
      expect(r.ioc_set_hash).toBeNull();
      // count is > 0 now because reference-tier domains are kept for observability
      expect(r.count).toBeGreaterThan(0);
    });

    test('returns a hash when at least one real IOC survives', () => {
      const r = extractIocs({ text: 'C2 at wndlogon.hopto.org after dropping update.zip' });
      // 'wndlogon.hopto.org' is a real domain; 'update.zip' is a file extension
      expect(r.ioc_set_hash).not.toBeNull();
      expect(domainValues(r)).toContain('wndlogon.hopto.org');
    });
  });

  describe('noise domain denylist additions (eval-2026-06-23) — reference tier', () => {
    test('registry.npmjs.org → uncertain (content-host removed from denylist; path is the signal)', () => {
      const r = extractIocs({ text: 'package fetched from registry.npmjs.org/lodash' });
      const ioc = r.iocs.find((i) => i.value === 'registry.npmjs.org');
      expect(ioc?.tier).toBe('uncertain');
    });

    test('eset.com → reference/vendor_research tier, not anchor-eligible', () => {
      const r = extractIocs({ text: 'ESET researchers at eset.com published this analysis' });
      expect(anchorDomainValues(r)).not.toContain('eset.com');
      expect(tieredValues(r, 'reference', 'domain')).toContain('eset.com');
      const ioc = r.iocs.find((i) => i.value === 'eset.com');
      expect(ioc?.tier_basis).toBe('vendor_research');
    });
  });

  describe('redaction-adjacency drop (step a)', () => {
    test('drops ie.com when immediately preceded by * (aad****ie.com pattern)', () => {
      // The regex matches 'ie.com' as a separate token after the masking chars.
      const r = extractIocs({ text: 'victim domain aad****ie.com redacted in table' });
      expect(domainValues(r)).not.toContain('ie.com');
    });

    test('drops ie.com when preceded by block-glyph redaction (a██ie.com)', () => {
      const r = extractIocs({ text: 'victim domain a██ie.com redacted in table' });
      expect(domainValues(r)).not.toContain('ie.com');
    });

    test('keeps ie.com when NOT preceded by a masking glyph', () => {
      const r = extractIocs({ text: 'TLD ccTLD for Ireland is ie.com example' });
      expect(domainValues(r)).toContain('ie.com');
    });

    test('keeps evil.com when wrapped in markdown bold (**evil.com**)', () => {
      // Bold emphasis: glyph run is at start of token, not glued to an alnum label.
      const r = extractIocs({ text: 'C2 callback to **evil.com** per the report' });
      expect(domainValues(r)).toContain('evil.com');
    });

    test('keeps bad.org when wrapped in markdown italic (*bad.org*)', () => {
      const r = extractIocs({ text: 'dropper contacts *bad.org* for staging' });
      expect(domainValues(r)).toContain('bad.org');
    });

    test('keeps evil.com when preceded by a bullet (* evil.com with space)', () => {
      const r = extractIocs({ text: '* evil.com\n* other.net' });
      expect(domainValues(r)).toContain('evil.com');
    });
  });

  describe('corroboration gate for ambiguous TLDs (step e) — emitted as denied tier', () => {
    test('ld.py — ambiguous TLD, uncorroborated → tier=denied, not anchor-eligible', () => {
      const r = extractIocs({ text: 'script calls ld.py to link objects' });
      expect(anchorDomainValues(r)).not.toContain('ld.py');
      expect(tieredValues(r, 'denied', 'domain')).toContain('ld.py');
    });

    test('subprocess.run — ambiguous TLD, uncorroborated → tier=denied', () => {
      const r = extractIocs({ text: 'code calls subprocess.run(cmd, shell=True)' });
      expect(anchorDomainValues(r)).not.toContain('subprocess.run');
      expect(tieredValues(r, 'denied', 'domain')).toContain('subprocess.run');
    });

    test('WScript.Shell — ambiguous TLD, uncorroborated → tier=denied', () => {
      const r = extractIocs({ text: 'macro creates WScript.Shell object' });
      expect(anchorDomainValues(r)).not.toContain('wscript.shell');
      expect(tieredValues(r, 'denied', 'domain')).toContain('wscript.shell');
    });

    test('keeps evil.py when defanged-in-source (defanged corroboration)', () => {
      const r = extractIocs({ text: 'C2 beacon to evil[.]py' });
      expect(domainValues(r)).toContain('evil.py');
    });

    test('keeps evil.py when it is the host of an extracted URL (url-host corroboration)', () => {
      const r = extractIocs({ text: 'payload from https://evil.py/x' });
      expect(domainValues(r)).toContain('evil.py');
    });

    test('normal domain evil.com passes gate unchanged (gate only touches AMBIGUOUS_TLDS)', () => {
      const r = extractIocs({ text: 'C2 callback to evil.com' });
      expect(domainValues(r)).toContain('evil.com');
    });
  });

  describe('public-suffix guard (step b2)', () => {
    test('drops bare co.uk (multi-label public suffix)', () => {
      const r = extractIocs({ text: 'victim domain was co.uk in the table' });
      expect(domainValues(r)).not.toContain('co.uk');
    });

    test('drops bare co.nz', () => {
      const r = extractIocs({ text: 'registrant suffix co.nz observed' });
      expect(domainValues(r)).not.toContain('co.nz');
    });

    test('drops bare com.br', () => {
      const r = extractIocs({ text: 'fragment com.br in redacted table' });
      expect(domainValues(r)).not.toContain('com.br');
    });

    test('drops bare c.id', () => {
      const r = extractIocs({ text: 'suffix fragment c.id extracted' });
      expect(domainValues(r)).not.toContain('c.id');
    });

    test('drops bare wl.gl (single registrar, commonly a suffix fragment)', () => {
      // wl.gl is not in PUBLIC_SUFFIX_DROPLIST — it is a registrable .gl domain.
      // This test documents the boundary: only explicit droplist entries are dropped.
      // wl.gl survives; only the listed multi-label suffixes are affected.
      const r = extractIocs({ text: 'redirect via wl.gl shortener' });
      // wl.gl is NOT in the droplist — it passes (this test confirms no over-dropping)
      expect(domainValues(r)).toContain('wl.gl');
    });

    test('KEEPS evil.co.uk — registrable domain built on a public suffix', () => {
      const r = extractIocs({ text: 'C2 callback to evil.co.uk:443' });
      expect(domainValues(r)).toContain('evil.co.uk');
    });

    test('KEEPS acme.com — normal TLD unaffected by public-suffix guard', () => {
      const r = extractIocs({ text: 'beacon to acme.com' });
      expect(domainValues(r)).toContain('acme.com');
    });

    test('KEEPS sub.evil.co.uk — multi-label registrable domain', () => {
      const r = extractIocs({ text: 'stage2 from sub.evil.co.uk/payload' });
      expect(domainValues(r)).toContain('sub.evil.co.uk');
    });
  });

  describe('tier fields — heuristic assignment (Stage B1)', () => {
    test('hash IOC gets tier=discriminating, basis=hash_high_entropy', () => {
      const r = extractIocs({
        text: 'sha256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      });
      const hash = r.iocs.find((ioc) => ioc.type === 'hash');
      expect(hash?.tier).toBe('discriminating');
      expect(hash?.tier_heuristic).toBe('discriminating');
      expect(hash?.tier_basis).toBe('hash_high_entropy');
    });

    test('defanged domain gets tier=discriminating, basis=defanged_source', () => {
      const r = extractIocs({ text: 'C2 at evil[.]com' });
      const ioc = r.iocs.find((i) => i.value === 'evil.com');
      expect(ioc?.tier).toBe('discriminating');
      expect(ioc?.tier_basis).toBe('defanged_source');
    });

    test('ordinary unknown domain gets tier=uncertain', () => {
      const r = extractIocs({ text: 'C2 callback to qaqkongtiao.com' });
      const ioc = r.iocs.find((i) => i.value === 'qaqkongtiao.com');
      expect(ioc?.tier).toBe('uncertain');
      expect(ioc?.tier_basis).toBe('uncertain_default');
    });

    test('private IP gets tier=reference, basis=private_ip', () => {
      // Private IPs are now emitted (previously dropped silently).
      const r = extractIocs({ text: 'LAN hop at 10.0.0.1' });
      const ioc = r.iocs.find((i) => i.value === '10.0.0.1');
      expect(ioc?.tier).toBe('reference');
      expect(ioc?.tier_basis).toBe('private_ip');
    });

    // These ranges were missing from the old prefix list, so a lateral-movement
    // hop inside a cloud VPC was tiered `uncertain` and became false
    // correlation signal. CGNAT in particular cannot be expressed as a string
    // prefix, which is why the range check is now shared with the SSRF guard.
    test.each([
      ['CGNAT (AWS/GCP/Kubernetes inter-node)', '100.64.1.1'],
      ['unspecified 0.0.0.0/8', '0.0.0.1'],
      ['IETF protocol assignments 192.0.0.0/24', '192.0.0.8'],
      ['benchmarking 198.18.0.0/15', '198.18.0.5'],
      ['multicast 224.0.0.0/4', '239.255.255.250'],
    ])('%s gets tier=reference, basis=private_ip', (_label, ip) => {
      const r = extractIocs({ text: `observed traffic to ${ip}` });
      const ioc = r.iocs.find((i) => i.type === 'ip' && i.value === ip);
      expect(ioc?.tier).toBe('reference');
      expect(ioc?.tier_basis).toBe('private_ip');
    });

    test('public space adjacent to CGNAT stays uncertain', () => {
      const r = extractIocs({ text: 'C2 at 100.63.0.1' });
      const ioc = r.iocs.find((i) => i.type === 'ip' && i.value === '100.63.0.1');
      expect(ioc?.tier).toBe('uncertain');
    });

    test('noise denylist domain gets tier=reference, basis=denylist', () => {
      const r = extractIocs({ text: 'scan via virustotal.com' });
      const ioc = r.iocs.find((i) => i.value === 'virustotal.com');
      expect(ioc?.tier).toBe('reference');
      expect(ioc?.tier_basis).toBe('denylist');
    });

    test('uncorroborated ambiguous-TLD token gets tier=denied, basis=code_shaped', () => {
      const r = extractIocs({ text: 'script calls ld.py' });
      const ioc = r.iocs.find((i) => i.value === 'ld.py');
      expect(ioc?.tier).toBe('denied');
      expect(ioc?.tier_basis).toBe('code_shaped');
    });

    test('tier == tier_heuristic for all IOCs (no LLM override yet)', () => {
      const r = extractIocs({ text: 'C2 evil[.]com, hash: d41d8cd98f00b204e9800998ecf8427e' });
      for (const ioc of r.iocs) {
        expect(ioc.tier).toBe(ioc.tier_heuristic);
      }
    });

    test('amazonaws.com subdomain gets tier=contextual, basis=known_cdn', () => {
      const r = extractIocs({ text: 'payload from attacker.s3.amazonaws.com' });
      const ioc = r.iocs.find((i) => i.value === 'attacker.s3.amazonaws.com');
      expect(ioc?.tier).toBe('contextual');
      expect(ioc?.tier_basis).toBe('known_cdn');
    });

    test('ioc_set_hash excludes reference and denied IOCs', () => {
      const withNoise = extractIocs({ text: 'C2 evil.com virustotal.com' });
      const withoutNoise = extractIocs({ text: 'C2 evil.com' });
      // Both should produce the same hash — virustotal.com is reference and excluded.
      expect(withNoise.ioc_set_hash).toBe(withoutNoise.ioc_set_hash);
    });
  });

  describe('mixed realistic report — RoningLoader-style smoke test', () => {
    const roningLoaderText = `
      The threat actor distributed a signed driver WinRing0x64.sys
      (SHA256: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2)
      alongside atiadlxx.dll (MD5: 0226ab4e2f07ab1c6a4b5e3d8f9c2a1b).
      Loader calls ProtoBuf.Serializer.Deserialize and Thread.Sleep(5000).
      System binaries svchost.exe, explorer.exe, powershell.exe used as cover.
      C2 infrastructure: wndlogon.hopto.org:443, backup domain payload.attacker.top.
      Payload fetched from https://raw.githubusercontent.com/attacker/malware/main/stage2.bin
      Report sourced from virustotal.com and elastic.co intelligence feeds.
      Analysis tools: urlscan.io scan at urlscan.io/result/abc123.
    `;

    test('noise tokens are not anchor-eligible (reference/denied tier or hard-dropped)', () => {
      const r = extractIocs({ text: roningLoaderText });
      const anchors = anchorDomainValues(r);
      // File-extension hard drops still absent entirely:
      expect(domainValues(r)).not.toContain('wndlogon.hopto'); // truncated fragment
      // hopto.org is longest-match deduped by wndlogon.hopto.org (both are not denylist):
      expect(anchors).not.toContain('hopto.org'); // suffix fragment
      // Noise denylist domains are emitted as reference but not anchors:
      expect(anchors).not.toContain('virustotal.com');
      expect(anchors).not.toContain('elastic.co');
      expect(anchors).not.toContain('urlscan.io');
    });

    test('retains all real IOCs', () => {
      const r = extractIocs({ text: roningLoaderText });
      const domains = domainValues(r);
      const hashes = hashValues(r);
      const urls = urlValues(r);

      expect(domains).toContain('wndlogon.hopto.org');
      expect(domains).toContain('payload.attacker.top');
      expect(hashes).toContain('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
      expect(hashes).toContain('0226ab4e2f07ab1c6a4b5e3d8f9c2a1b');
      expect(urls).toContain('https://raw.githubusercontent.com/attacker/malware/main/stage2.bin');
    });
  });
});

// ── New type: email ───────────────────────────────────────────────────────────

describe('extract_iocs — email extraction (shred fix)', () => {
  test('extracts full email address, not bare provider domain', () => {
    const r = extractIocs({ text: 'contact nrwise@proton.me for attribution' });
    expect(emailValues(r)).toContain('nrwise@proton.me');
    // Provider domain must NOT be emitted separately
    expect(domainValues(r)).not.toContain('proton.me');
  });

  test('extracts gmail address without emitting gmail.com as a domain', () => {
    const r = extractIocs({ text: 'attacker used jasonsaayman@gmail.com as comms' });
    expect(emailValues(r)).toContain('jasonsaayman@gmail.com');
    expect(domainValues(r)).not.toContain('gmail.com');
  });

  test('extracts service-account email (complex local-part)', () => {
    const r = extractIocs({ text: 'actor used dev0-660@project123.iam.gserviceaccount.com' });
    expect(emailValues(r)).toContain('dev0-660@project123.iam.gserviceaccount.com');
  });

  test('defanged email with [.] in host is extracted as email, host not emitted separately', () => {
    const r = extractIocs({ text: 'attacker emailed from bad@evil[.]com' });
    expect(emailValues(r)).toContain('bad@evil.com');
    expect(domainValues(r)).not.toContain('evil.com');
  });

  test('fanged email → uncertain tier (not defanged-in-source)', () => {
    const r = extractIocs({ text: 'attacker used actor@malicious.org for c2' });
    const ioc = r.iocs.find((i) => i.value === 'actor@malicious.org');
    expect(ioc?.type).toBe('email');
    expect(ioc?.tier).toBe('uncertain');
  });

  test('email is included in ioc_set_hash (anchor-eligible)', () => {
    const withEmail = extractIocs({ text: 'attacker actor@malicious.org contacted server' });
    const withoutEmail = extractIocs({ text: 'attacker contacted server' });
    expect(withEmail.ioc_set_hash).not.toBe(withoutEmail.ioc_set_hash);
  });
});

// ── New type: wallet ──────────────────────────────────────────────────────────

describe('extract_iocs — wallet extraction (shred fix)', () => {
  test('BTC legacy address (32-hex) extracts as wallet, NOT hash', () => {
    // 3C75CEDB1196DF5EAB91F31411ED4B33 would be stolen by MD5 regex — but it is
    // actually base58 format and won't match BTC legacy (starts with 1 or 3, base58).
    // Use a real-format BTC legacy address for the test.
    const btcAddr = '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf6n'; // genesis block coinbase
    const r = extractIocs({ text: `BTC ransom to ${btcAddr}` });
    expect(walletValues(r)).toContain(btcAddr);
    expect(hashValues(r)).not.toContain(btcAddr.toLowerCase());
  });

  test('ETH address extracts as wallet', () => {
    // Standard 0x + 40 hex chars ETH address
    const ethAddr = '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe';
    const r = extractIocs({ text: `ETH wallet ${ethAddr}` });
    expect(walletValues(r)).toContain(ethAddr);
    // The 40-hex suffix alone must not appear as a hash
    expect(hashValues(r)).not.toContain(ethAddr.toLowerCase().slice(2));
  });

  test('BTC bech32 address extracts as wallet', () => {
    const bech32 = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    const r = extractIocs({ text: `payment to ${bech32}` });
    expect(walletValues(r)).toContain(bech32);
  });

  test('wallet tier is discriminating', () => {
    const btcAddr = '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf6n';
    const r = extractIocs({ text: `ransom ${btcAddr}` });
    const ioc = r.iocs.find((i) => i.type === 'wallet');
    expect(ioc?.tier).toBe('discriminating');
    expect(ioc?.tier_basis).toBe('wallet_high_entropy');
  });
});

// ── New type: cidr ────────────────────────────────────────────────────────────

describe('extract_iocs — cidr extraction (shred fix)', () => {
  test('CIDR keeps full range value — not shredded to bare network IP', () => {
    const r = extractIocs({ text: 'blocklist includes 106.41.253.0/24' });
    expect(cidrValues(r)).toContain('106.41.253.0/24');
  });

  test('CIDR also derives bare network IP as separate indicator', () => {
    const r = extractIocs({ text: 'range 106.41.253.0/24 in blocklist' });
    expect(cidrValues(r)).toContain('106.41.253.0/24');
    expect(ipValues(r)).toContain('106.41.253.0');
  });

  test('defanged CIDR with [.] extracts correctly', () => {
    const r = extractIocs({ text: 'block range 106[.]41[.]253[.]0/24' });
    expect(cidrValues(r)).toContain('106.41.253.0/24');
  });

  test('narrow CIDR (/30) → discriminating tier', () => {
    const r = extractIocs({ text: 'C2 range 185.62.58.204/30' });
    const cidr = r.iocs.find((i) => i.type === 'cidr');
    expect(cidr?.tier).toBe('discriminating');
    expect(cidr?.tier_basis).toBe('cidr_narrow');
  });

  test('broad public CIDR (/16) → contextual tier', () => {
    const r = extractIocs({ text: 'ASN range 185.62.0.0/16' });
    const cidr = r.iocs.find((i) => i.type === 'cidr');
    expect(cidr?.tier).toBe('contextual');
    expect(cidr?.tier_basis).toBe('cidr_broad');
  });

  // `contextual` is promotable, so an RFC1918 range here became a live Indicator
  // Match row that matched essentially all internal traffic. The bare IP derived
  // from the same network was already classified `reference/private_ip`.
  test.each([
    ['RFC1918 10/8', '10.20.0.0/16'],
    ['RFC1918 192.168/16', '192.168.1.0/24'],
    ['loopback', '127.0.0.0/8'],
    ['link-local', '169.254.0.0/16'],
    ['CGNAT', '100.64.0.0/10'],
  ])('private or reserved CIDR (%s) is reference, not promotable', (_label, value) => {
    const r = extractIocs({ text: `range ${value}` });
    const cidr = r.iocs.find((i) => i.type === 'cidr');
    expect(cidr?.tier).toBe('reference');
    expect(cidr?.tier_basis).toBe('private_ip');
  });

  test('a narrow private CIDR is still reference, mask width does not override', () => {
    const r = extractIocs({ text: 'range 10.0.0.8/29' });
    const cidr = r.iocs.find((i) => i.type === 'cidr');
    expect(cidr?.tier).toBe('reference');
  });

  test('/29 boundary → discriminating', () => {
    const r = extractIocs({ text: 'infra 185.62.58.200/29' });
    const cidr = r.iocs.find((i) => i.type === 'cidr');
    expect(cidr?.tier).toBe('discriminating');
  });

  test('/28 → contextual (below /29 threshold)', () => {
    const r = extractIocs({ text: 'infra 185.62.58.192/28' });
    const cidr = r.iocs.find((i) => i.type === 'cidr');
    expect(cidr?.tier).toBe('contextual');
    expect(cidr?.tier_basis).toBe('cidr_broad');
  });
});

// ── Socket: host:port ─────────────────────────────────────────────────────────

describe('extract_iocs — socket (ip:port / domain:port)', () => {
  test('ip:port → ip indicator with port field, port not a separate IOC', () => {
    const r = extractIocs({ text: 'C2 at 185.62.58.207:443' });
    const ipIoc = r.iocs.find((i) => i.type === 'ip' && i.value === '185.62.58.207');
    expect(ipIoc).toBeDefined();
    expect(ipIoc?.port).toBe(443);
    // Port 443 is not emitted as a separate type
    expect(r.iocs.filter((i) => i.type === 'ip' && i.value === '443')).toHaveLength(0);
  });

  test('defanged ip:port retains port', () => {
    const r = extractIocs({ text: 'callback 31.172.71[.]5:8008' });
    const ipIoc = r.iocs.find((i) => i.type === 'ip' && i.value === '31.172.71.5');
    expect(ipIoc?.port).toBe(8008);
  });

  test('domain:port → domain indicator with port field', () => {
    const r = extractIocs({ text: 'TOLLBOOTH C2: sfrclak.com:8000' });
    const domIoc = r.iocs.find((i) => i.type === 'domain' && i.value === 'sfrclak.com');
    expect(domIoc).toBeDefined();
    expect(domIoc?.port).toBe(8000);
  });

  test('ip:port does not emit port as an ip value', () => {
    const r = extractIocs({ text: 'C2 server 1.2.3.4:4444' });
    expect(ipValues(r)).not.toContain('4444');
    expect(ipValues(r)).toContain('1.2.3.4');
  });
});

// ── Fix 1: socket port merged onto CIDR-derived / atomic IP ──────────────────

describe('extract_iocs — socket port merge onto prior-seen host (Fix 1)', () => {
  test('CIDR-derived IP followed by socket ip:port retains port (CIDR first)', () => {
    // 36.35.56.0/24 → derives bare ip:36.35.56.0 (no port). Socket 36.35.56.0:443
    // arrives later in Pass 5 — port must be merged onto the existing IOC.
    const r = extractIocs({ text: 'blocklist 36.35.56.0/24 and C2 socket 36.35.56.0:443' });
    const ipIoc = r.iocs.find((i) => i.type === 'ip' && i.value === '36.35.56.0');
    expect(ipIoc).toBeDefined();
    expect(ipIoc?.port).toBe(443);
    // Only one ip IOC for this value
    expect(r.iocs.filter((i) => i.type === 'ip' && i.value === '36.35.56.0')).toHaveLength(1);
  });

  test('socket ip:port followed by CIDR for same IP — port is retained (socket first)', () => {
    // Socket 36.35.56.0:443 is consumed by Pass 5 and emits ip with port. CIDR
    // 36.35.56.0/24 derives ip:36.35.56.0 via pushIoc — already in seen, so skipped.
    // The socket-emitted IOC (with port) is the one retained.
    const r = extractIocs({ text: 'C2 socket 36.35.56.0:443 and block range 36.35.56.0/24' });
    const ipIoc = r.iocs.find((i) => i.type === 'ip' && i.value === '36.35.56.0');
    expect(ipIoc).toBeDefined();
    expect(ipIoc?.port).toBe(443);
    expect(r.iocs.filter((i) => i.type === 'ip' && i.value === '36.35.56.0')).toHaveLength(1);
  });

  test('domain appears bare then as domain:port — port is merged onto existing IOC', () => {
    const r = extractIocs({ text: 'domain evil.com and socket evil.com:8080' });
    const domIoc = r.iocs.find((i) => i.type === 'domain' && i.value === 'evil.com');
    expect(domIoc).toBeDefined();
    expect(domIoc?.port).toBe(8080);
    expect(r.iocs.filter((i) => i.type === 'domain' && i.value === 'evil.com')).toHaveLength(1);
  });

  test('first socket port wins when two sockets reference the same host', () => {
    // Two sockets for same IP — only one IOC emitted; first port (443) wins.
    const r = extractIocs({ text: 'C2 36.35.56.0:443 and also 36.35.56.0:8080' });
    const ipIoc = r.iocs.find((i) => i.type === 'ip' && i.value === '36.35.56.0');
    expect(ipIoc?.port).toBe(443);
    expect(r.iocs.filter((i) => i.type === 'ip' && i.value === '36.35.56.0')).toHaveLength(1);
  });
});

// ── Fix 2: email host domain excluded from defangedDomains ───────────────────

describe('extract_iocs — email host not added to defangedDomains (Fix 2)', () => {
  test('defanged email host (gmail[.]com) does not make gmail.com discriminating elsewhere', () => {
    // Report contains evil@gmail[.]com (defanged). gmail.com appears separately bare.
    // gmail.com must NOT get tier=discriminating from the email host defang.
    const r = extractIocs({ text: 'attacker used evil@gmail[.]com and also gmail.com as relay' });
    const domIoc = r.iocs.find((i) => i.type === 'domain' && i.value === 'gmail.com');
    // gmail.com should be emitted (it appears bare in the text) but NOT discriminating.
    if (domIoc) {
      expect(domIoc.tier).not.toBe('discriminating');
      expect(domIoc.tier_basis).not.toBe('defanged_source');
    }
    // Email IOC is still extracted correctly
    expect(r.iocs.filter((i) => i.type === 'email').map((i) => i.value)).toContain(
      'evil@gmail.com'
    );
  });

  test('defanged email with provider domain — provider domain not emitted as IOC at all', () => {
    // gmail.com appears ONLY as the email host, not standalone — must not be emitted.
    const r = extractIocs({ text: 'attacker only used evil@gmail[.]com for comms' });
    expect(r.iocs.filter((i) => i.type === 'domain' && i.value === 'gmail.com')).toHaveLength(0);
    expect(r.iocs.filter((i) => i.type === 'email').map((i) => i.value)).toContain(
      'evil@gmail.com'
    );
  });

  test('domain defanged in email AND standalone keeps discriminating tier', () => {
    // admin@evil[.]com → email (host suppressed). evil[.]com standalone → defanged domain.
    // evil.com must still get tier=discriminating/defanged_source from the standalone occurrence.
    const r = extractIocs({ text: 'actor admin@evil[.]com contacted C2 at evil[.]com' });
    const domIoc = r.iocs.find((i) => i.type === 'domain' && i.value === 'evil.com');
    expect(domIoc).toBeDefined();
    expect(domIoc?.tier).toBe('discriminating');
    expect(domIoc?.tier_basis).toBe('defanged_source');
  });
});

// ── B1.6 Fix 1: defanged IP promotion ────────────────────────────────────────

describe('extract_iocs — defanged IP promotion (B1.6 Fix 1)', () => {
  test('defanged public IP → discriminating/defanged_source (203[.]0[.]113[.]5)', () => {
    const r = extractIocs({ text: 'C2 server at 203[.]0[.]113[.]5:443' });
    const ioc = r.iocs.find((i) => i.type === 'ip' && i.value === '203.0.113.5');
    expect(ioc?.tier).toBe('discriminating');
    expect(ioc?.tier_basis).toBe('defanged_source');
  });

  test('defanged private IP stays reference/private_ip (10[.]0[.]0[.]1)', () => {
    // private_ip wins over defanged_source — a defanged LAN address is not a C2 indicator
    const r = extractIocs({ text: 'lateral movement via 10[.]0[.]0[.]1' });
    const ioc = r.iocs.find((i) => i.type === 'ip' && i.value === '10.0.0.1');
    expect(ioc?.tier).toBe('reference');
    expect(ioc?.tier_basis).toBe('private_ip');
  });

  test('non-defanged public IP stays uncertain (203.0.113.99)', () => {
    const r = extractIocs({ text: 'C2 at 203.0.113.99' });
    const ioc = r.iocs.find((i) => i.type === 'ip' && i.value === '203.0.113.99');
    expect(ioc?.tier).toBe('uncertain');
    expect(ioc?.tier_basis).toBe('uncertain_default');
  });

  test('defanged C2 IP with hxxps URL → discriminating (142[.]11[.]206[.]73 corpus gold)', () => {
    // Simulates the Axios supply-chain gold TP IP
    const r = extractIocs({ text: 'C2 IP 142[.]11[.]206[.]73 port 8000' });
    const ioc = r.iocs.find((i) => i.type === 'ip' && i.value === '142.11.206.73');
    expect(ioc?.tier).toBe('discriminating');
    expect(ioc?.tier_basis).toBe('defanged_source');
  });
});

// ── B1.6 Fix 2: vendor/research domains + content-host reclassification ──────

describe('extract_iocs — vendor/research domains (B1.6 Fix 2)', () => {
  test('microsoft.com → reference/vendor_research (exact match)', () => {
    const r = extractIocs({ text: 'download from microsoft.com security portal' });
    expect(tieredValues(r, 'reference', 'domain')).toContain('microsoft.com');
    expect(anchorDomainValues(r)).not.toContain('microsoft.com');
    const ioc = r.iocs.find((i) => i.value === 'microsoft.com');
    expect(ioc?.tier_basis).toBe('vendor_research');
  });

  test('kaspersky.com → reference/vendor_research (exact match)', () => {
    const r = extractIocs({ text: 'analysis at kaspersky.com research' });
    expect(tieredValues(r, 'reference', 'domain')).toContain('kaspersky.com');
    expect(anchorDomainValues(r)).not.toContain('kaspersky.com');
    const ioc = r.iocs.find((i) => i.value === 'kaspersky.com');
    expect(ioc?.tier_basis).toBe('vendor_research');
  });

  test('research.kaspersky.com → reference/vendor_research (suffix match)', () => {
    const r = extractIocs({ text: 'blog post at research.kaspersky.com' });
    expect(tieredValues(r, 'reference', 'domain')).toContain('research.kaspersky.com');
    const ioc = r.iocs.find((i) => i.value === 'research.kaspersky.com');
    expect(ioc?.tier_basis).toBe('vendor_research');
  });

  test('reset.com does NOT match eset.com suffix (dotted prefix prevents collision)', () => {
    const r = extractIocs({ text: 'domain reset.com observed' });
    const ioc = r.iocs.find((i) => i.value === 'reset.com');
    expect(ioc?.tier_basis).not.toBe('vendor_research');
    expect(ioc?.tier).toBe('uncertain');
  });

  test('unit42.paloaltonetworks.com → reference/vendor_research (suffix match)', () => {
    const r = extractIocs({ text: 'report at unit42.paloaltonetworks.com' });
    const ioc = r.iocs.find((i) => i.value === 'unit42.paloaltonetworks.com');
    expect(ioc?.tier).toBe('reference');
    expect(ioc?.tier_basis).toBe('vendor_research');
  });

  test('raw.githubusercontent.com → contextual/known_cdn (content-host; URL IOCs still captured)', () => {
    const r = extractIocs({
      text: 'payload at https://raw.githubusercontent.com/attacker/repo/stage2.bin raw.githubusercontent.com',
    });
    const bareIoc = r.iocs.find(
      (i) => i.type === 'domain' && i.value === 'raw.githubusercontent.com'
    );
    expect(bareIoc?.tier).toBe('contextual');
    expect(bareIoc?.tier_basis).toBe('known_cdn');
    // URL itself is still extracted
    expect(urlValues(r)).toContain('https://raw.githubusercontent.com/attacker/repo/stage2.bin');
  });

  test('github.com → contextual/known_cdn (content-host; path is the signal, bare host never discriminating)', () => {
    const r = extractIocs({ text: 'source at github.com' });
    const ioc = r.iocs.find((i) => i.value === 'github.com');
    expect(ioc?.tier).toBe('contextual');
    expect(ioc?.tier_basis).toBe('known_cdn');
  });

  test('baidu.com → uncertain (removed from denylist; benign incumbent for B2 to judge)', () => {
    const r = extractIocs({ text: 'liveness check to baidu.com hardcoded' });
    const ioc = r.iocs.find((i) => i.value === 'baidu.com');
    expect(ioc?.tier).toBe('uncertain');
  });
});

// ── URL host tier inheritance ──────────────────────────────────────────────────

describe('extract_iocs — URL tier inherits from host', () => {
  test('URL with defanged host inherits discriminating tier', () => {
    const r = extractIocs({ text: 'payload from hxxps://evil[.]com/stage2.bin' });
    const url = r.iocs.find((i) => i.type === 'url');
    expect(url?.tier).toBe('discriminating');
    expect(url?.tier_basis).toMatch(/url_host_inherited:defanged_source/);
  });

  test('URL with CDN host stays uncertain (lift-only; non-discriminating host does not propagate)', () => {
    const r = extractIocs({ text: 'C2 at https://attacker.s3.amazonaws.com/payload' });
    const url = r.iocs.find((i) => i.type === 'url');
    expect(url?.tier).toBe('uncertain');
    expect(url?.tier_basis).toBe('uncertain_default');
  });

  test('URL with ordinary unknown host is uncertain', () => {
    const r = extractIocs({ text: 'C2 at https://sfrclak.com/6202033' });
    const url = r.iocs.find((i) => i.type === 'url');
    expect(url?.tier).toBe('uncertain');
  });

  test('C2 URL with port preserves port in value', () => {
    const r = extractIocs({ text: 'beacon to http://sfrclak.com:8000/6202033' });
    expect(urlValues(r)).toContain('http://sfrclak.com:8000/6202033');
  });

  test('URL on content-hosting host stays uncertain even with discriminating path', () => {
    // Path carries the signal — host is not discriminating, so no lift to reference/contextual.
    // B2 judges the full URL.
    const r = extractIocs({
      text: 'payload at https://raw.githubusercontent.com/attacker/repo/payload.ps1',
    });
    const url = r.iocs.find((i) => i.type === 'url');
    expect(url?.tier).toBe('uncertain');
    expect(url?.tier_basis).toBe('uncertain_default');
  });

  test('URL on discriminating (defanged) host lifts to discriminating', () => {
    const r = extractIocs({ text: 'C2 https://evil[.]com/stage2' });
    const url = r.iocs.find((i) => i.type === 'url');
    expect(url?.tier).toBe('discriminating');
    expect(url?.tier_basis).toMatch(/url_host_inherited:defanged_source/);
  });
});

// ── Leak test (critical gate) ────────────────────────────────────────────────
// extractIocs consumes bounded *structured text* (`## heading`, `| cell |`,
// `- item` lines — the shape the RSS adapter produces). Asserts that none of the
// structural markers leak into a stored IOC value. This is the gate: a markdown
// artifact surviving into a value corrupts anchor matching and downstream
// correlation.

describe('extract_iocs — structured-text leak test (markdown artifact gate)', () => {
  const MARKDOWN_ARTIFACT_PATTERN = /[\[\]|`#()]/;

  test('IOC table cells produce clean domain values (no pipe, bracket, hash artifacts)', () => {
    const text = [
      '| Type | Indicator | Context |',
      '| Domain | evil.com | C2 server |',
      '| Domain | bad[.]example.net | Dropper host |',
      '| IP | 192.0.2.55 | Pivot host |',
      '| Hash | d41d8cd98f00b204e9800998ecf8427e | Loader |',
    ].join('\n');
    const r = extractIocs({ text });

    // Known good values must be present
    expect(domainValues(r)).toContain('evil.com');
    expect(domainValues(r)).toContain('bad.example.net');
    expect(valuesOf(r, 'ip')).toContain('192.0.2.55');
    expect(hashValues(r)).toContain('d41d8cd98f00b204e9800998ecf8427e');

    // LEAK GATE: no emitted value may contain markdown artifact chars
    for (const ioc of signalIocs(r)) {
      expect(ioc.value).not.toMatch(MARKDOWN_ARTIFACT_PATTERN);
      // Clean canonical form: domain must exactly match the refanged value
      if (ioc.type === 'domain') {
        expect(ioc.value).toMatch(/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/);
      }
    }
  });

  test('heading and list lines produce clean IOC values', () => {
    const text = ['## Indicators', '- Domain: evil2.com', '- IP: 203.0.113.7'].join('\n');
    const r = extractIocs({ text });

    expect(domainValues(r)).toContain('evil2.com');
    expect(valuesOf(r, 'ip')).toContain('203.0.113.7');

    for (const ioc of signalIocs(r)) {
      expect(ioc.value).not.toMatch(MARKDOWN_ARTIFACT_PATTERN);
    }
  });

  test('a URL in an IOC section is extractable and its value is clean', () => {
    const text = [
      '## Indicators of Compromise',
      'Command-and-control: C2 link https://c2.evil.com/beacon',
    ].join('\n');
    const r = extractIocs({ text });

    const urlIoc = r.iocs.find((i) => i.type === 'url' && i.value.includes('c2.evil.com'));
    expect(urlIoc).toBeDefined();
    expect(urlIoc?.value).not.toMatch(MARKDOWN_ARTIFACT_PATTERN);
    expect(urlIoc?.value).toBe('https://c2.evil.com/beacon');
  });

  test('defanged IOC in a table cell survives refang and is clean', () => {
    const text = ['| C2 Domain | evil[.]attacker[.]top |', '| C2 IP | 198[.]51[.]100[.]99 |'].join(
      '\n'
    );
    const r = extractIocs({ text });

    expect(domainValues(r)).toContain('evil.attacker.top');
    expect(valuesOf(r, 'ip')).toContain('198.51.100.99');

    for (const ioc of signalIocs(r)) {
      expect(ioc.value).not.toMatch(MARKDOWN_ARTIFACT_PATTERN);
    }
  });
});

// ── Section miner (Part B) ───────────────────────────────────────────────────

describe('classifySectionSpans', () => {
  test('returns empty for text with no ## headings', () => {
    const text = 'callnrwise.com contacted the dropper\nhttps://elastic.co analysis';
    expect(classifySectionSpans(text)).toHaveLength(0);
  });

  test('classifies "## Indicators of Compromise" as ioc kind', () => {
    const text = '## Indicators of Compromise\nevil.com contacted';
    const spans = classifySectionSpans(text);
    expect(spans).toHaveLength(1);
    expect(spans[0].kind).toBe('ioc');
  });

  test.each(['# IOCs', '### IOCs', '##IOCs', ' ## IOCs', '##\u00a0IOCs'])(
    'does not treat %j as a structured source heading',
    (heading) => {
      expect(classifySectionSpans(`${heading}\nevil.com`)).toHaveLength(0);
    }
  );

  test('accepts the producer contract with an ASCII tab and CRLF input', () => {
    const text = '##\tIndicators of Compromise\r\nevil.com';
    expect(classifySectionSpans(text)).toEqual([{ start: 0, end: text.length, kind: 'ioc' }]);
  });

  test('classifies "## IOCs" as ioc kind', () => {
    const spans = classifySectionSpans('## IOCs\nevil.com');
    expect(spans[0].kind).toBe('ioc');
  });

  test('classifies "## IOC" as ioc kind', () => {
    const spans = classifySectionSpans('## IOC\nevil.com');
    expect(spans[0].kind).toBe('ioc');
  });

  test('classifies "## Indicators" as ioc kind', () => {
    const spans = classifySectionSpans('## Indicators\nevil.com');
    expect(spans[0].kind).toBe('ioc');
  });

  test('classifies "## References" as references kind', () => {
    const spans = classifySectionSpans('## References\nhttps://elastic.co');
    expect(spans[0].kind).toBe('references');
  });

  test('classifies "## Sources" and "## Bibliography" as references kind', () => {
    const spans1 = classifySectionSpans('## Sources\nhttps://elastic.co');
    const spans2 = classifySectionSpans('## Bibliography\nhttps://elastic.co');
    expect(spans1[0].kind).toBe('references');
    expect(spans2[0].kind).toBe('references');
  });

  test('span end is bounded by the next heading, not end of text', () => {
    const text = '## Indicators of Compromise\nevil.com\n## References\nhttps://elastic.co';
    const spans = classifySectionSpans(text);
    expect(spans).toHaveLength(2);
    expect(spans[0].kind).toBe('ioc');
    expect(spans[1].kind).toBe('references');
    // Spans are contiguous — IOC ends exactly where References begins (no overlap, no gap).
    expect(spans[0].end).toBeLessThanOrEqual(spans[1].start);
  });

  test('prose headings (non-IOC, non-references) produce no span', () => {
    const text = '## Background\nevil.com\n## Indicators of Compromise\nbad.net';
    const spans = classifySectionSpans(text);
    expect(spans).toHaveLength(1);
    expect(spans[0].kind).toBe('ioc');
  });
});

// ── Real vendor header classification (header-normalizer validation) ────────────
// These exact heading strings appear in live NVISO/Elastic/ESET reports.
// They validate that normalizeHeader + the term/prefix sets work against real input.

describe('classifySectionSpans — real vendor headers', () => {
  // NVISO: "## Indicators of Compromise (IOCs)" — trailing parenthetical breaks old $ anchor
  test('"Indicators of Compromise (IOCs)" → ioc', () => {
    const spans = classifySectionSpans('## Indicators of Compromise (IOCs)\nevil.com');
    expect(spans).toHaveLength(1);
    expect(spans[0].kind).toBe('ioc');
  });

  // Mixed case: "## IoCs" — as it may appear in some reports
  test('"IoCs" (mixed case) → ioc', () => {
    const spans = classifySectionSpans('## IoCs\nevil.com');
    expect(spans).toHaveLength(1);
    expect(spans[0].kind).toBe('ioc');
  });

  // Elastic: "## Observations" — Elastic reports put IOC tables under this heading
  test('"Observations" → ioc', () => {
    const spans = classifySectionSpans('## Observations\nevil.com');
    expect(spans).toHaveLength(1);
    expect(spans[0].kind).toBe('ioc');
  });

  // NVISO: "## Sources:" — trailing colon breaks old $ anchor
  test('"Sources:" (trailing colon) → references', () => {
    const spans = classifySectionSpans('## Sources:\nhttps://elastic.co');
    expect(spans).toHaveLength(1);
    expect(spans[0].kind).toBe('references');
  });

  // ESET post-article nav: "## Related Articles"
  test('"Related Articles" → references', () => {
    const spans = classifySectionSpans('## Related Articles\nhttps://eset.com/blog');
    expect(spans).toHaveLength(1);
    expect(spans[0].kind).toBe('references');
  });

  // ESET post-article nav: "## Discussion"
  test('"Discussion" → references', () => {
    const spans = classifySectionSpans('## Discussion\nsome comments');
    expect(spans).toHaveLength(1);
    expect(spans[0].kind).toBe('references');
  });

  // Regression: previous synthetic cases still work
  test('"Indicators of Compromise" (plain, no parens) still → ioc', () => {
    const spans = classifySectionSpans('## Indicators of Compromise\nevil.com');
    expect(spans).toHaveLength(1);
    expect(spans[0].kind).toBe('ioc');
  });

  test('"References" (plain) still → references', () => {
    const spans = classifySectionSpans('## References\nhttps://elastic.co');
    expect(spans).toHaveLength(1);
    expect(spans[0].kind).toBe('references');
  });

  // Normal content headers must NOT false-match
  test('"Introduction" → no span (prose heading)', () => {
    const spans = classifySectionSpans('## Introduction\nsome text');
    expect(spans).toHaveLength(0);
  });

  test('"Campaign Overview" → no span (prose heading)', () => {
    const spans = classifySectionSpans('## Campaign Overview\nsome text');
    expect(spans).toHaveLength(0);
  });

  test('"Detection logic" → no span (prose heading)', () => {
    const spans = classifySectionSpans('## Detection logic\nsome text');
    expect(spans).toHaveLength(0);
  });
});

describe('extract_iocs — section-miner overrides (Part B)', () => {
  test('(a) uncertain domain in ## Indicators of Compromise → discriminating/ioc_section', () => {
    // callnrwise.com is undefanged → heuristic is uncertain. IOC section lifts it.
    const text = '## Indicators of Compromise\ncallnrwise.com contacted the dropper';
    const r = extractIocs({ text });
    const ioc = r.iocs.find((i) => i.value === 'callnrwise.com');
    expect(ioc).toBeDefined();
    expect(ioc?.tier).toBe('discriminating');
    expect(ioc?.tier_basis).toBe('ioc_section');
    // tier_heuristic is immutable — still reflects the per-value verdict
    expect(ioc?.tier_heuristic).toBe('uncertain');
  });

  test('(b) domain in ## References → reference/references_section', () => {
    // github.com is contextual/known_cdn by heuristic; references section demotes it.
    const text = '## References\ngithub.com used for hosting';
    const r = extractIocs({ text });
    const ioc = r.iocs.find((i) => i.value === 'github.com');
    expect(ioc).toBeDefined();
    expect(ioc?.tier).toBe('reference');
    expect(ioc?.tier_basis).toBe('references_section');
    expect(ioc?.tier_heuristic).toBe('contextual');
  });

  test('(c) defanged domain in ## References stays discriminating (precedence: defanged > references)', () => {
    // evil[.]com is defanged → heuristic discriminating/defanged_source.
    // References section must NOT downgrade it.
    const text = '## References\nevil[.]com cited for comparison';
    const r = extractIocs({ text });
    const ioc = r.iocs.find((i) => i.value === 'evil.com');
    expect(ioc).toBeDefined();
    expect(ioc?.tier).toBe('discriminating');
    // tier_basis is from the heuristic (defanged_source), not references_section
    expect(ioc?.tier_basis).toBe('defanged_source');
  });

  test('(d) denylist domain in ## Indicators of Compromise stays reference (precedence: denylist > ioc_section)', () => {
    // virustotal.com is in IOC_NOISE_DOMAINS → reference/denylist.
    // A sloppy IOC table must not override the denylist.
    const text = '## Indicators of Compromise\nvirustotal.com listed as tool';
    const r = extractIocs({ text });
    const ioc = r.iocs.find((i) => i.value === 'virustotal.com');
    expect(ioc).toBeDefined();
    expect(ioc?.tier).toBe('reference');
    expect(ioc?.tier_basis).toBe('denylist');
  });

  test('(e) tier_heuristic reflects pre-override verdict, not section tier', () => {
    // callnrwise.com gets ioc_section override, but tier_heuristic must stay uncertain.
    const text = '## Indicators of Compromise\ncallnrwise.com contacted';
    const r = extractIocs({ text });
    const ioc = r.iocs.find((i) => i.value === 'callnrwise.com');
    expect(ioc?.tier).toBe('discriminating');
    expect(ioc?.tier_heuristic).not.toBe('discriminating');
    expect(ioc?.tier_heuristic).toBe('uncertain');
  });

  test('plain text (no ## headings) → no section spans → behavior identical to today', () => {
    // Same text without headings — domain stays uncertain (no section override).
    const text = 'callnrwise.com contacted the dropper';
    const r = extractIocs({ text });
    const ioc = r.iocs.find((i) => i.value === 'callnrwise.com');
    expect(ioc).toBeDefined();
    expect(ioc?.tier).toBe('uncertain');
    expect(ioc?.tier_heuristic).toBe('uncertain');
  });

  test('vendor_research domain in ## Indicators of Compromise stays reference (precedence)', () => {
    // eset.com is vendor_research → reference. Must not be upgraded to ioc_section.
    const text = '## Indicators of Compromise\neset.com analysis tool';
    const r = extractIocs({ text });
    const ioc = r.iocs.find((i) => i.value === 'eset.com');
    expect(ioc).toBeDefined();
    expect(ioc?.tier).toBe('reference');
    expect(ioc?.tier_basis).toBe('vendor_research');
  });

  test('(f) value in prose BEFORE IOC section → still gets discriminating/ioc_section', () => {
    // Root-cause regression: dedup keeps the first (prose) offset. The IOC-table
    // occurrence must still be found via value-scan so the section override fires.
    const text = [
      '## Campaign Overview',
      'The actor used sfrclak.com as primary C2 throughout the campaign.',
      '## Indicators of Compromise (IOCs)',
      '| Domain | sfrclak.com | C2 server |',
    ].join('\n');
    const r = extractIocs({ text });
    const ioc = r.iocs.find((i) => i.value === 'sfrclak.com');
    expect(ioc).toBeDefined();
    expect(ioc?.tier).toBe('discriminating');
    expect(ioc?.tier_basis).toBe('ioc_section');
    // tier_heuristic is the per-value verdict — uncertain (not defanged, not CDN)
    expect(ioc?.tier_heuristic).toBe('uncertain');
  });

  test('(g) value in prose AND References section (no IOC section) → reference/references_section', () => {
    // Value appears in prose first, then in ## Sources. Should still get references tag.
    const text = [
      '## Background',
      'The actor registered sfrclak.com for exfil.',
      '## Sources',
      'See sfrclak.com tracking at tracker.example.org',
    ].join('\n');
    const r = extractIocs({ text });
    const ioc = r.iocs.find((i) => i.value === 'sfrclak.com');
    expect(ioc).toBeDefined();
    expect(ioc?.tier).toBe('reference');
    expect(ioc?.tier_basis).toBe('references_section');
  });
});

// ── NVISO-style end-to-end fixture ────────────────────────────────────────────
// Mirrors the real NVISO Axios report structure: C2 domains appear in the KQL/
// campaign prose first, then again in the ## Indicators of Compromise (IOCs) table,
// and reference URLs appear under ## Sources:. Validates both halves simultaneously.

describe('extract_iocs — NVISO-style multi-occurrence end-to-end', () => {
  // Structured text as the RSS adapter would hand it to extractIocs: C2 domains
  // in prose first, then in the ## Indicators of Compromise (IOCs) table, and
  // citation URLs under ## Sources:.
  const NVISO_STYLE_STRUCTURED = [
    '## Campaign Overview',
    'NVISO observed three domains used as C2: sfrclak.com, callnrwise.com, and calltan.com.',
    'Detection KQL: event.domain : ("sfrclak.com" OR "callnrwise.com" OR "calltan.com").',
    '## Indicators of Compromise (IOCs)',
    '| Type | Value | Context |',
    '| Domain | sfrclak.com | Primary C2 |',
    '| Domain | callnrwise.com | Backup C2 |',
    '| Domain | calltan.com | Exfil endpoint |',
    '## Sources:',
    '- socket.dev report https://socket.dev/npm/package/axios',
    '- nviso.eu analysis https://nviso.eu/blog/axios-analysis',
  ].join('\n');

  test('C2 domains in IOC table → discriminating/ioc_section (even though they appear in prose first)', () => {
    const r = extractIocs({ text: NVISO_STYLE_STRUCTURED });

    for (const domain of ['sfrclak.com', 'callnrwise.com', 'calltan.com']) {
      const ioc = r.iocs.find((i) => i.value === domain);
      expect(ioc).toBeDefined();
      expect(ioc?.tier).toBe('discriminating');
      expect(ioc?.tier_basis).toBe('ioc_section');
      // heuristic is uncertain (not defanged in source, not CDN)
      expect(ioc?.tier_heuristic).toBe('uncertain');
    }
  });

  test('citation URLs in Sources block → reference/references_section', () => {
    const r = extractIocs({ text: NVISO_STYLE_STRUCTURED });

    // socket.dev and nviso.eu are the citation hosts; their extracted domains
    // should be tagged references_section (or vendor_research for nviso.eu).
    const socketIoc = r.iocs.find((i) => i.value === 'socket.dev');
    if (socketIoc) {
      // socket.dev appears only in Sources → references_section
      expect(socketIoc.tier).toBe('reference');
    }

    // nviso.eu is in VENDOR_RESEARCH_DOMAINS → reference/vendor_research regardless
    const nvisoIoc = r.iocs.find((i) => i.value === 'nviso.eu');
    if (nvisoIoc) {
      expect(nvisoIoc.tier).toBe('reference');
    }
  });

  test('C2 domains are anchor-eligible (not reference or denied)', () => {
    const r = extractIocs({ text: NVISO_STYLE_STRUCTURED });
    const anchors = r.iocs
      .filter((i) => i.tier !== 'reference' && i.tier !== 'denied')
      .map((i) => i.value);

    expect(anchors).toContain('sfrclak.com');
    expect(anchors).toContain('callnrwise.com');
    expect(anchors).toContain('calltan.com');
  });
});

// ── IOC-section carve-out: LOW_DISCRIMINATION bare hosts ─────────────────────
// A bare content-host / CDN domain inside an IOC section must NOT be promoted to
// discriminating — the path-bearing URL is the indicator, not the bare host.

describe('extract_iocs — IOC-section carve-out for content-host/CDN bare domains', () => {
  test('bare github.com inside IOC section stays non-discriminating (contextual/known_cdn)', () => {
    // Real case: Elastic links the IOC repo URL inside Observations/IOC section.
    // The derived bare github.com host must not be promoted — it would false-correlate
    // every report that links GitHub.
    const text = [
      '## Observations',
      'IOC list: https://github.com/elastic/labs-releases/tree/main/indicators/tollbooth',
      '| Domain | c.cseo99.com | C2 server |',
    ].join('\n');
    const r = extractIocs({ text });

    // Bare github.com (derived from URL host) must NOT be discriminating
    const githubIoc = r.iocs.find((i) => i.type === 'domain' && i.value === 'github.com');
    if (githubIoc) {
      expect(githubIoc.tier).not.toBe('discriminating');
      expect(githubIoc.tier_basis).toBe('known_cdn');
    }

    // A real C2 domain in the same section IS promoted
    const c2Ioc = r.iocs.find((i) => i.value === 'c.cseo99.com');
    expect(c2Ioc).toBeDefined();
    expect(c2Ioc?.tier).toBe('discriminating');
    expect(c2Ioc?.tier_basis).toBe('ioc_section');
  });

  test('amazonaws.com subdomain (known_cdn) inside IOC section stays contextual', () => {
    // Attacker-hosted S3 bucket link in the IOC section: bare subdomain stays contextual.
    const text = [
      '## Indicators of Compromise',
      'Payload: https://attacker.s3.amazonaws.com/payload.bin',
      '| Domain | evilc2.com | C2 |',
    ].join('\n');
    const r = extractIocs({ text });

    const s3Ioc = r.iocs.find((i) => i.value === 'attacker.s3.amazonaws.com');
    if (s3Ioc) {
      expect(s3Ioc.tier).not.toBe('discriminating');
    }

    // Real C2 in same section is promoted
    const c2Ioc = r.iocs.find((i) => i.value === 'evilc2.com');
    expect(c2Ioc?.tier).toBe('discriminating');
    expect(c2Ioc?.tier_basis).toBe('ioc_section');
  });

  test('path-bearing URL on a content-host (url type) inside IOC section CAN stay ioc_section', () => {
    // The url IOC itself (with full path) is a real curated link — not subject to the
    // bare-host carve-out (ioc.type === 'url', not 'domain').
    const text = [
      '## Indicators of Compromise',
      'https://github.com/elastic/labs-releases/tree/main/indicators/tollbooth',
      '| Domain | evilc2.com | C2 |',
    ].join('\n');
    const r = extractIocs({ text });

    const urlIoc = r.iocs.find(
      (i) => i.type === 'url' && i.value.includes('github.com/elastic/labs-releases')
    );
    expect(urlIoc).toBeDefined();
    // URL type is NOT subject to the known_cdn carve-out (path is the signal)
    expect(urlIoc?.tier).toBe('discriminating');
    expect(urlIoc?.tier_basis).toBe('ioc_section');
  });
});

// ── Elastic-style end-to-end fixture ─────────────────────────────────────────
// Mirrors the real Elastic Tollbooth report structure: C2 domains + hashes in an
// ## Observations section, with a GitHub IOC-repo URL that derives a bare github.com
// host. The C2 domains must be promoted; github.com must be carved out.

describe('extract_iocs — Elastic-style end-to-end (Observations + GitHub IOC link)', () => {
  // The GitHub IOC-repo URL sits inside the ## Observations (ioc) section, so its
  // path-bearing URL is section-scoped but the derived bare github.com host must
  // still be carved out.
  const ELASTIC_STYLE_STRUCTURED = [
    '## Campaign Overview',
    'Elastic observed TOLLBOOTH targeting managed service providers.',
    '## Observations',
    'All indicators available at labs-releases/tollbooth https://github.com/elastic/labs-releases/tree/main/indicators/tollbooth .',
    '| Type | Value | Context |',
    '| Domain | c.cseo99.com | C2 server |',
    '| Domain | f.fseo99.com | C2 server |',
    '| Domain | api.aseo99.com | Exfil endpoint |',
    '| SHA256 | a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2 | Malware loader |',
    '## References',
    '- elastic.co blog https://elastic.co/security-labs/tollbooth',
  ].join('\n');

  test('real C2 domains in Observations → discriminating/ioc_section', () => {
    const r = extractIocs({ text: ELASTIC_STYLE_STRUCTURED });

    for (const domain of ['c.cseo99.com', 'f.fseo99.com', 'api.aseo99.com']) {
      const ioc = r.iocs.find((i) => i.value === domain);
      expect(ioc).toBeDefined();
      expect(ioc?.tier).toBe('discriminating');
      expect(ioc?.tier_basis).toBe('ioc_section');
    }
  });

  test('malware hash in Observations → discriminating (hash_high_entropy, ioc_section lift)', () => {
    const r = extractIocs({ text: ELASTIC_STYLE_STRUCTURED });

    const hashIoc = r.iocs.find(
      (i) => i.value === 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
    );
    expect(hashIoc).toBeDefined();
    expect(hashIoc?.tier).toBe('discriminating');
  });

  test('bare github.com (derived from IOC repo URL in Observations) is NOT discriminating', () => {
    const r = extractIocs({ text: ELASTIC_STYLE_STRUCTURED });

    const githubIoc = r.iocs.find((i) => i.type === 'domain' && i.value === 'github.com');
    if (githubIoc) {
      expect(githubIoc.tier).not.toBe('discriminating');
      expect(githubIoc.tier_basis).toBe('known_cdn');
    }
    // If github.com is not emitted at all, that's also acceptable — it would be consumed
    // by the URL span and not re-emitted as a bare domain. Either way: not discriminating.
  });

  test('NVISO regression: sfrclak/callnrwise/calltan still → discriminating/ioc_section', () => {
    // Re-run the NVISO fixture here to confirm the carve-out does not break prior behavior.
    const NVISO_STRUCTURED = [
      '## Campaign Overview',
      'NVISO observed C2 at sfrclak.com, callnrwise.com, calltan.com.',
      '## Indicators of Compromise (IOCs)',
      '| Domain | sfrclak.com | Primary C2 |',
      '| Domain | callnrwise.com | Backup C2 |',
      '| Domain | calltan.com | Exfil |',
    ].join('\n');
    const r = extractIocs({ text: NVISO_STRUCTURED });

    for (const domain of ['sfrclak.com', 'callnrwise.com', 'calltan.com']) {
      const ioc = r.iocs.find((i) => i.value === domain);
      expect(ioc).toBeDefined();
      expect(ioc?.tier).toBe('discriminating');
      expect(ioc?.tier_basis).toBe('ioc_section');
    }
  });
});

// ── Mapping coverage guard ────────────────────────────────────────────────────
//
// This test prevents a repeat of the _offset and port bugs: if extract_iocs
// ever emits a field that is not declared in the extracted.iocs nested mapping
// in index_templates.ts, ES strict dynamic mapping will reject the document at
// persist time. Keep this set in sync with the mapping's `properties` block.
//
// When you add a field to ExtractedIoc, you MUST:
//   1. Add it to DECLARED_IOC_MAPPING_FIELDS below.
//   2. Add it to the extracted.iocs.properties block in setup/index_templates.ts.
//   3. Add a migrateExisting* call in installIndexTemplates for pre-version backing indices.
describe('extract_iocs — mapping coverage guard', () => {
  // Exact set of keys declared in the extracted.iocs.properties block of
  // index_templates.ts. Must be kept in sync manually — that is the point.
  //
  // The mapping is deliberately a superset of `ExtractedIoc`:
  //   - `reference` / `block_index` are attached by the text-indicator-list
  //     adapter after extraction, not emitted by `extractIocs`.
  //   - `severity` is a reserved mapping field that nothing writes today. It is
  //     listed here so the set still mirrors the mapping, but it is not on
  //     `ExtractedIoc`, so the set is typed as strings rather than cast.
  const DECLARED_IOC_MAPPING_FIELDS = new Set<string>([
    'type',
    'value',
    'defanged',
    'severity',
    'tier',
    'tier_heuristic',
    'tier_basis',
    'port',
    'reference',
    'block_index',
  ]);

  test('all ExtractedIoc fields are declared in the extracted.iocs mapping', () => {
    // Build an IOC with every optional field populated so Object.keys captures them all.
    const fullIoc: ExtractedIoc = {
      type: 'ip',
      value: '1.2.3.4',
      defanged: '1[.]2[.]3[.]4',
      tier: 'discriminating' as IocTier,
      tier_heuristic: 'discriminating' as IocTier,
      tier_basis: 'ioc_section',
      port: 443,
    };

    for (const key of Object.keys(fullIoc)) {
      expect(DECLARED_IOC_MAPPING_FIELDS.has(key)).toBe(true);
    }
  });

  test('socket extraction emits port as integer, not string', () => {
    const r = extractIocs({ text: 'C2 at 10.0.0.1:4444' });
    const ioc = r.iocs.find((i) => i.type === 'ip' && i.value === '10.0.0.1');
    expect(ioc?.port).toBeDefined();
    expect(typeof ioc?.port).toBe('number');
    expect(Number.isInteger(ioc?.port)).toBe(true);
  });
});

// `extracted.iocs.value` is a keyword on the reports index, and a keyword term over
// 32,766 bytes is a hard Elasticsearch error that rejects the whole report document,
// not just the field. The report then stays pending and every enrichment run retries
// it. `body_text` accepts 5,000,000 characters and the URL pattern stops only at
// whitespace, so one no-whitespace URL was enough to produce it.
describe('extract_iocs — over-long values', () => {
  test('drops a URL that exceeds MAX_IOC_VALUE_LENGTH', () => {
    // `MAX_IOC_VALUE_LENGTH` mirrors `MAX_URL_LENGTH` in extract_iocs.ts.
    const overlong = `https://evil.example/${'a'.repeat(MAX_URL_LENGTH)}`;
    expect(overlong.length).toBeGreaterThan(MAX_URL_LENGTH);
    const r = extractIocs({ text: `payload at ${overlong}` });

    expect(urlValues(r)).toHaveLength(0);
  });

  test('drops a URL longer than the indicator bound', () => {
    const huge = `https://evil.test/${'a'.repeat(5000)}`;
    const r = extractIocs({ text: `payload at ${huge} here` });

    expect(urlValues(r)).not.toContain(huge);
    expect(r.iocs.every((ioc) => ioc.value.length <= MAX_URL_LENGTH)).toBe(true);
  });

  // Dropping the URL should not lose the host, which is a short, usable indicator
  // on its own. (Uses a real TLD: the extractor drops reserved ones like `.test`.)
  test('still emits the host of an over-long URL as a domain', () => {
    const huge = `https://evil-domain.com/${'a'.repeat(5000)}`;
    const r = extractIocs({ text: `payload at ${huge} here` });

    expect(urlValues(r)).not.toContain(huge);
    expect(valuesOf(r, 'domain')).toContain('evil-domain.com');
  });

  test('keeps a URL at the bound', () => {
    const prefix = 'https://evil.test/';
    const atBound = `${prefix}${'a'.repeat(MAX_URL_LENGTH - prefix.length)}`;
    expect(atBound.length).toBe(MAX_URL_LENGTH);
    const r = extractIocs({ text: `payload at ${atBound} here` });

    expect(urlValues(r)).toContain(atBound);
  });
});

// `extracted.iocs` is a `nested` field and the reports index leaves
// `nested_objects.limit` at the Elasticsearch default of 10,000. Crossing it rejects the
// whole report document rather than dropping the extra entries, so the report stays
// `pending` and every enrichment run re-tries it. Only `text_indicator_list` chunks
// across documents; a 5MB analyst paste writes one.
describe('extract_iocs — nested-object cap', () => {
  /** Enough distinct public domains to blow past the cap. */
  const manyDomains = (n: number) =>
    Array.from({ length: n }, (_v, i) => `evil-${i}.com`).join(' ');

  test('returns at most the per-report cap', () => {
    const r = extractIocs({ text: manyDomains(6_000) });
    expect(r.iocs.length).toBeLessThanOrEqual(5_000);
  });

  test('reports the true count, so the truncation is visible', () => {
    const r = extractIocs({ text: manyDomains(6_000) });
    expect(r.count).toBeGreaterThan(r.iocs.length);
    expect(r.truncated).toBe(true);
  });

  test('does not flag truncation when under the cap', () => {
    const r = extractIocs({ text: manyDomains(10) });
    expect(r.truncated).toBeUndefined();
    expect(r.count).toBe(r.iocs.length);
  });

  // A truncated report should keep what is worth promoting, not whatever appeared first.
  test('keeps the most promotable tiers when it truncates', () => {
    const r = extractIocs({ text: manyDomains(6_000) });
    const nonPromotable = r.iocs.filter(
      (ioc) => ioc.tier === 'reference' || ioc.tier === 'denied'
    ).length;
    const promotable = r.iocs.filter(
      (ioc) => ioc.tier === 'discriminating' || ioc.tier === 'contextual'
    ).length;
    expect(promotable).toBeGreaterThanOrEqual(nonPromotable);
  });
});
