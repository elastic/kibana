/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractIocs } from './extract_iocs';

/** Helper: extract IOC values of a specific type from the result. */
const valuesOf = (result: ReturnType<typeof extractIocs>, type: string) =>
  result.iocs.filter((ioc) => ioc.type === type).map((ioc) => ioc.value);

const domainValues = (result: ReturnType<typeof extractIocs>) => valuesOf(result, 'domain');
const hashValues = (result: ReturnType<typeof extractIocs>) => valuesOf(result, 'hash');
const urlValues = (result: ReturnType<typeof extractIocs>) => valuesOf(result, 'url');

// ── Refang + normalization (Phase 1a) ─────────────────────────────────────────

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

    test('recovers 10[.]0[.]0[.]1 (private — still dropped)', () => {
      // Refang recovers the dotted-quad form, but private-IP filter then drops it.
      const r = extractIocs({ text: 'LAN hop at 10[.]0[.]0[.]1' });
      expect(valuesOf(r, 'ip')).not.toContain('10.0.0.1');
    });

    test('recovers 192[.]168[.]1[.]100 (private — still dropped)', () => {
      const r = extractIocs({ text: 'pivot via 192[.]168[.]1[.]100' });
      expect(valuesOf(r, 'ip')).not.toContain('192.168.1.100');
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

    test('url value is lowercased', () => {
      const r = extractIocs({ text: 'from hXXps://Bad.Example.Com/Path' });
      expect(urlValues(r)).toContain('https://bad.example.com/path');
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

  describe('noise domain denylist (step 4)', () => {
    test('rejects elastic.co', () => {
      const r = extractIocs({ text: 'report analyzed via elastic.co detection rules' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects urlscan.io', () => {
      const r = extractIocs({ text: 'scan at urlscan.io shows the payload' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects virustotal.com', () => {
      const r = extractIocs({ text: 'virustotal.com detection rate 12/72' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects abuse.ch', () => {
      const r = extractIocs({ text: 'hash listed on abuse.ch and bazaar.abuse.ch' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects github.com bare domain', () => {
      const r = extractIocs({ text: 'source code at github.com' });
      expect(domainValues(r)).toEqual([]);
    });

    test('rejects attack.mitre.org', () => {
      const r = extractIocs({ text: 'technique T1059 at attack.mitre.org' });
      expect(domainValues(r)).toEqual([]);
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
      // 'malicious' is not in LOLBAS_NAMES, so this passes all filters
      const r = extractIocs({ text: 'beacon to malicious.evil.top' });
      expect(domainValues(r)).toContain('malicious.evil.top');
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

    test('retains legitimate GitHub subdomains used for C2', () => {
      // raw.githubusercontent.com — not covered by bare 'github.com' noise entry
      const r = extractIocs({
        text: 'payload fetched from raw.githubusercontent.com via certutil',
      });
      expect(domainValues(r)).toContain('raw.githubusercontent.com');
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

  describe('ioc_set_hash — computed from surviving IOCs only', () => {
    test('returns null when all tokens are noise', () => {
      // WScript.Shell excluded: .shell is a real branded IANA gTLD.
      const r = extractIocs({
        text: 'svchost.exe explorer.exe WScript.Execute Thread.Sleep elastic.co virustotal.com',
      });
      expect(r.ioc_set_hash).toBeNull();
      expect(r.count).toBe(0);
    });

    test('returns a hash when at least one real IOC survives', () => {
      const r = extractIocs({ text: 'C2 at wndlogon.hopto.org after dropping update.zip' });
      // 'wndlogon.hopto.org' is a real domain; 'update.zip' is a file extension
      expect(r.ioc_set_hash).not.toBeNull();
      expect(domainValues(r)).toContain('wndlogon.hopto.org');
    });
  });

  describe('noise domain denylist additions (eval-2026-06-23)', () => {
    test('rejects registry.npmjs.org', () => {
      const r = extractIocs({ text: 'package fetched from registry.npmjs.org/lodash' });
      expect(domainValues(r)).not.toContain('registry.npmjs.org');
    });

    test('rejects eset.com (vendor self-citation)', () => {
      const r = extractIocs({ text: 'ESET researchers at eset.com published this analysis' });
      expect(domainValues(r)).not.toContain('eset.com');
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

  describe('corroboration gate for ambiguous TLDs (step e)', () => {
    test('drops ld.py — ambiguous TLD, uncorroborated', () => {
      const r = extractIocs({ text: 'script calls ld.py to link objects' });
      expect(domainValues(r)).not.toContain('ld.py');
    });

    test('drops subprocess.run — ambiguous TLD, uncorroborated', () => {
      const r = extractIocs({ text: 'code calls subprocess.run(cmd, shell=True)' });
      expect(domainValues(r)).not.toContain('subprocess.run');
    });

    test('drops WScript.Shell — ambiguous TLD, uncorroborated', () => {
      const r = extractIocs({ text: 'macro creates WScript.Shell object' });
      expect(domainValues(r)).not.toContain('wscript.shell');
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

    test('drops all noise tokens', () => {
      const r = extractIocs({ text: roningLoaderText });
      const domains = domainValues(r);
      // These MUST NOT appear
      expect(domains).not.toContain('wndlogon.hopto'); // truncated
      expect(domains).not.toContain('hopto.org'); // suffix fragment
      expect(domains).not.toContain('virustotal.com'); // noise denylist
      expect(domains).not.toContain('elastic.co'); // noise denylist
      expect(domains).not.toContain('urlscan.io'); // noise denylist
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
