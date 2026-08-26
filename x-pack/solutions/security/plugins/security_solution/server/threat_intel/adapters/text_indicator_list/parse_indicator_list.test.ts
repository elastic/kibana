/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseIndicatorList, classifyReference } from './parse_indicator_list';
import { extractIocs } from '../../services/extract_iocs';
import type { ExtractIocsResult, ExtractedIoc } from '../../services/extract_iocs';
import type { IocType } from '../../../../common/threat_intel';

jest.mock('../../services/extract_iocs');

const extractIocsMock = extractIocs as jest.MockedFunction<typeof extractIocs>;

const empty = (): ExtractIocsResult => ({ count: 0, iocs: [], ioc_set_hash: null });

const makeIoc = (
  type: IocType,
  value: string,
  extra: Partial<ExtractedIoc> = {}
): ExtractedIoc => ({
  type,
  value,
  tier: 'contextual',
  tier_heuristic: 'contextual',
  tier_basis: 'original_basis',
  ...extra,
});

const makeResult = (...iocs: ExtractedIoc[]): ExtractIocsResult => ({
  count: iocs.length,
  iocs,
  ioc_set_hash: null,
});

beforeEach(() => {
  extractIocsMock.mockReset();
  extractIocsMock.mockReturnValue(empty());
});

describe('classifyReference', () => {
  it('classifies twitter.com as social', () => {
    expect(classifyReference('https://twitter.com/user/status/123')).toBe('social');
  });

  it('classifies x.com as social', () => {
    expect(classifyReference('https://x.com/foo')).toBe('social');
  });

  it('classifies t.me as social', () => {
    expect(classifyReference('https://t.me/channel')).toBe('social');
  });

  it('classifies pastebin.com as social', () => {
    expect(classifyReference('https://pastebin.com/abc123')).toBe('social');
  });

  it('classifies t.co (twitter shortener) as social', () => {
    expect(classifyReference('https://t.co/xyz')).toBe('social');
  });

  it('classifies subdomains of social hosts as social', () => {
    expect(classifyReference('https://mobile.twitter.com/foo')).toBe('social');
  });

  it('classifies a vendor blog as candidate', () => {
    expect(classifyReference('https://blog.somevendor.com/emotet-writeup')).toBe('candidate');
  });

  it('classifies an arbitrary unknown domain as candidate', () => {
    expect(classifyReference('https://threatintel.example.org/report')).toBe('candidate');
  });

  it('classifies a malformed URL as candidate', () => {
    expect(classifyReference('not-a-url')).toBe('candidate');
  });

  it('classifies an empty string as candidate', () => {
    expect(classifyReference('')).toBe('candidate');
  });
});

describe('parseIndicatorList', () => {
  describe('empty / trivial inputs', () => {
    it('returns [] for empty string', () => {
      expect(parseIndicatorList('')).toEqual([]);
    });

    it('returns [] for whitespace-only body', () => {
      expect(parseIndicatorList('   \n  \n  ')).toEqual([]);
    });

    it('returns [] for body with only non-reference comment lines', () => {
      const body = [
        '# Copyright (c) 2014-2026 Maltrail developers',
        '# See the file LICENSE for copying permission',
        '',
        '# another comment',
      ].join('\n');
      expect(parseIndicatorList(body)).toEqual([]);
    });
  });

  describe('multi-block interleaved fixture', () => {
    const TWITTER_REF = 'https://twitter.com/ozuma5119/status/112';
    const BLOG_REF = 'https://blog.somevendor.com/emotet-writeup';

    const DOMAIN_IOC = makeIoc('domain', 'tamsuamy.com', { defanged: 'tamsuamy.com' });
    const IP_PORT_IOC = makeIoc('ip', '66.84.11.168', { port: 8080, defanged: '66.84.11.168' });
    const IP_7080_IOC = makeIoc('ip', '142.4.198.249', { port: 7080, defanged: '142.4.198.249' });
    const IP_8080_IOC = makeIoc('ip', '170.150.11.245', { port: 8080, defanged: '170.150.11.245' });

    beforeEach(() => {
      extractIocsMock.mockImplementation(({ text }) => {
        if (text === 'tamsuamy.com') return makeResult(DOMAIN_IOC);
        if (text === '66.84.11.168:8080') return makeResult(IP_PORT_IOC);
        if (text === '142.4.198.249:7080') return makeResult(IP_7080_IOC);
        if (text === '170.150.11.245:8080') return makeResult(IP_8080_IOC);
        return empty();
      });
    });

    const body = [
      '# Copyright (c) 2014-2026 Maltrail developers (https://github.com/stamparm/maltrail)',
      "# See the file 'LICENSE' for copying permission",
      `# Reference: ${TWITTER_REF}`,
      'tamsuamy.com',
      '66.84.11.168:8080',
      `# Reference: ${BLOG_REF}`,
      '142.4.198.249:7080',
      '170.150.11.245:8080',
    ].join('\n');

    it('produces two blocks with correct block_index', () => {
      const blocks = parseIndicatorList(body);
      expect(blocks).toHaveLength(2);
      expect(blocks[0].block_index).toBe(0);
      expect(blocks[1].block_index).toBe(1);
    });

    it('attributes each IOC to the correct nearest reference', () => {
      const blocks = parseIndicatorList(body);
      expect(blocks[0].reference).toBe(TWITTER_REF);
      expect(blocks[1].reference).toBe(BLOG_REF);
    });

    it('propagates reference_class onto each block', () => {
      const blocks = parseIndicatorList(body);
      expect(blocks[0].reference_class).toBe('social');
      expect(blocks[1].reference_class).toBe('candidate');
    });

    it('block 0 contains the two IOCs under the twitter reference', () => {
      const blocks = parseIndicatorList(body);
      expect(blocks[0].iocs).toHaveLength(2);
      expect(blocks[0].iocs[0].value).toBe('tamsuamy.com');
      expect(blocks[0].iocs[1].value).toBe('66.84.11.168');
    });

    it('block 1 contains the two IOCs under the blog reference', () => {
      const blocks = parseIndicatorList(body);
      expect(blocks[1].iocs).toHaveLength(2);
      expect(blocks[1].iocs[0].value).toBe('142.4.198.249');
      expect(blocks[1].iocs[1].value).toBe('170.150.11.245');
    });

    it('skips copyright / license header comments — they do not become blocks', () => {
      const blocks = parseIndicatorList(body);
      // If copyright lines were treated as references they'd inflate the block count
      expect(blocks).toHaveLength(2);
    });
  });

  describe('tier stamping', () => {
    it('overrides extractIocs tier to discriminating and sets tier_basis to maltrail_indicator_list', () => {
      const contextualIoc = makeIoc('ip', '1.2.3.4', {
        tier: 'contextual',
        tier_heuristic: 'contextual',
        tier_basis: 'original',
      });
      extractIocsMock.mockReturnValue(makeResult(contextualIoc));

      const blocks = parseIndicatorList('# Reference: https://example.com/report\n1.2.3.4');
      expect(blocks[0].iocs[0].tier).toBe('discriminating');
      expect(blocks[0].iocs[0].tier_heuristic).toBe('discriminating');
      expect(blocks[0].iocs[0].tier_basis).toBe('maltrail_indicator_list');
    });

    it('preserves type and value from extractIocs', () => {
      const ioc = makeIoc('domain', 'evil.com');
      extractIocsMock.mockReturnValue(makeResult(ioc));

      const blocks = parseIndicatorList('# Reference: https://example.com/report\nevil.com');
      expect(blocks[0].iocs[0].type).toBe('domain');
      expect(blocks[0].iocs[0].value).toBe('evil.com');
    });
  });

  describe('port preservation', () => {
    it('preserves port field from extractIocs for ip:port lines', () => {
      const ipPortIoc = makeIoc('ip', '66.84.11.168', { port: 8080 });
      extractIocsMock.mockReturnValue(makeResult(ipPortIoc));

      const blocks = parseIndicatorList('# Reference: https://example.com\n66.84.11.168:8080');
      expect(blocks[0].iocs[0].port).toBe(8080);
    });

    it('emits no port field for plain IP lines', () => {
      const ipIoc = makeIoc('ip', '1.2.3.4');
      extractIocsMock.mockReturnValue(makeResult(ipIoc));

      const blocks = parseIndicatorList('# Reference: https://example.com\n1.2.3.4');
      expect(blocks[0].iocs[0].port).toBeUndefined();
    });
  });

  describe('IOC type variety', () => {
    it('handles url-type IOCs from extractIocs', () => {
      const urlIoc = makeIoc('url', 'http://malicious.example.com/payload');
      extractIocsMock.mockReturnValue(makeResult(urlIoc));

      const blocks = parseIndicatorList(
        '# Reference: https://blog.example.com\nhttp://malicious.example.com/payload'
      );
      expect(blocks[0].iocs[0].type).toBe('url');
    });
  });

  describe('indicators before first reference', () => {
    it('puts pre-reference indicators in block_index 0 with reference: undefined', () => {
      const orphanIoc = makeIoc('domain', 'orphan.com');
      const refIoc = makeIoc('domain', 'malicious.com');
      extractIocsMock.mockImplementation(({ text }) => {
        if (text === 'orphan.com') return makeResult(orphanIoc);
        if (text === 'malicious.com') return makeResult(refIoc);
        return empty();
      });

      const body = [
        'orphan.com',
        '# Reference: https://blog.example.com/post',
        'malicious.com',
      ].join('\n');
      const blocks = parseIndicatorList(body);

      expect(blocks).toHaveLength(2);
      expect(blocks[0].block_index).toBe(0);
      expect(blocks[0].reference).toBeUndefined();
      expect(blocks[0].reference_class).toBeUndefined();
      expect(blocks[0].iocs[0].value).toBe('orphan.com');
    });

    it('subsequent block after orphan block gets block_index 1', () => {
      const orphanIoc = makeIoc('domain', 'orphan.com');
      const refIoc = makeIoc('domain', 'malicious.com');
      extractIocsMock.mockImplementation(({ text }) => {
        if (text === 'orphan.com') return makeResult(orphanIoc);
        if (text === 'malicious.com') return makeResult(refIoc);
        return empty();
      });

      const body = [
        'orphan.com',
        '# Reference: https://blog.example.com/post',
        'malicious.com',
      ].join('\n');
      const blocks = parseIndicatorList(body);

      expect(blocks[1].block_index).toBe(1);
      expect(blocks[1].reference).toBe('https://blog.example.com/post');
    });
  });

  describe('tolerance of blank and unrecognised lines', () => {
    it('skips blank lines between indicators without creating phantom blocks', () => {
      const ioc = makeIoc('ip', '1.2.3.4');
      extractIocsMock.mockImplementation(({ text }) =>
        text === '1.2.3.4' ? makeResult(ioc) : empty()
      );

      const body = ['# Reference: https://example.com', '', '   ', '1.2.3.4', ''].join('\n');
      const blocks = parseIndicatorList(body);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].iocs).toHaveLength(1);
    });

    it('skips lines where extractIocs returns no IOCs', () => {
      extractIocsMock.mockReturnValue(empty());

      const body = ['# Reference: https://example.com', 'not-an-ioc-line'].join('\n');
      const blocks = parseIndicatorList(body);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].iocs).toHaveLength(0);
    });

    it('calls extractIocs with defang: false', () => {
      const ioc = makeIoc('domain', 'evil.com');
      extractIocsMock.mockReturnValue(makeResult(ioc));

      parseIndicatorList('# Reference: https://example.com\nevil.com');

      expect(extractIocs).toHaveBeenCalledWith({ text: 'evil.com', defang: false });
    });
  });

  describe('reference block with empty body → empty reference block', () => {
    it('a reference with no subsequent IOCs still emits a block', () => {
      extractIocsMock.mockReturnValue(empty());

      const body = '# Reference: https://example.com/page';
      const blocks = parseIndicatorList(body);

      expect(blocks).toHaveLength(1);
      expect(blocks[0].reference).toBe('https://example.com/page');
      expect(blocks[0].iocs).toHaveLength(0);
    });
  });
});

// ── Tier elevation ───────────────────────────────────────────────────────────

describe('parseIndicatorList — tier elevation', () => {
  // Appearing in a curated trail file is a strong signal, so an uncertain or
  // contextual value is elevated. It is not strong enough to override a verdict
  // the extractor already reached, and the promote task admits everything that is
  // not `reference` or `denied`, so blanket-elevating turned private addresses and
  // vendor domains into live Indicator Match rows.
  it.each([
    ['reference', 'ip', '10.0.0.1'],
    ['reference', 'domain', 'virustotal.com'],
    ['denied', 'domain', 'google.com'],
  ])('preserves a %s verdict from the extractor', (tier, type, value) => {
    extractIocsMock.mockReturnValue(
      makeResult(
        makeIoc(type as IocType, value, {
          tier: tier as ExtractedIoc['tier'],
          tier_heuristic: tier as ExtractedIoc['tier'],
          tier_basis: 'private_ip',
        })
      )
    );

    const [block] = parseIndicatorList(`# https://ref.example/trail\n${value}`);

    expect(block.iocs[0].tier).toBe(tier);
    expect(block.iocs[0].tier_basis).toBe('private_ip');
  });

  it.each([['contextual'], ['uncertain']])('elevates a %s verdict to discriminating', (tier) => {
    extractIocsMock.mockReturnValue(
      makeResult(
        makeIoc('ip', '185.220.101.45', {
          tier: tier as ExtractedIoc['tier'],
          tier_heuristic: tier as ExtractedIoc['tier'],
        })
      )
    );

    const [block] = parseIndicatorList('# https://ref.example/trail\n185.220.101.45');

    expect(block.iocs[0].tier).toBe('discriminating');
    expect(block.iocs[0].tier_basis).toBe('maltrail_indicator_list');
  });
});
