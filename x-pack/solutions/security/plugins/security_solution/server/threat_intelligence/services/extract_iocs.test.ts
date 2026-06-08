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
