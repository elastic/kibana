/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Special-use IPv4 and IPv6 range classification, shared by the two callers
 * that need it so their definitions cannot drift:
 *
 *   - `adapters/http_client` rejects these as SSRF targets.
 *   - `services/extract_iocs` tiers them as `reference` rather than treating
 *     them as candidate C2 anchors.
 *
 * These were previously separate implementations, and extract_iocs used string
 * prefix matching, which cannot express ranges like CGNAT 100.64.0.0/10 (that
 * would need all 64 prefixes `100.64.` through `100.127.`). It therefore missed
 * CGNAT, 0.0.0.0/8, 192.0.0.0/24, 198.18.0.0/15, and multicast/reserved, so a
 * lateral-movement hop inside an AWS VPC or GCP network was tiered `uncertain`
 * and became false correlation signal.
 */

/** Convert two 16-bit hex groups (as strings) to dotted-quad IPv4 notation. */
const hexGroupsToDotted = (hiHex: string, loHex: string): string => {
  const hi = parseInt(hiHex, 16);
  const lo = parseInt(loHex, 16);
  return [Math.floor(hi / 256), hi % 256, Math.floor(lo / 256), lo % 256].join('.');
};

/**
 * True for IPv4 addresses that are not routable public space: loopback,
 * link-local, RFC1918 private, CGNAT, "this network", IETF protocol
 * assignments, benchmarking, multicast and reserved.
 *
 * Expects a canonical dotted-quad. Obfuscated forms (integer, hex, octal) are
 * normalised by the WHATWG URL parser before they reach the SSRF caller, and
 * the IOC extractor only matches dotted-quad.
 */
export const isNonRoutableIPv4 = (ip: string): boolean => {
  const [a, b, c] = ip.split('.').map(Number);
  // loopback 127.0.0.0/8
  if (a === 127) return true;
  // link-local 169.254.0.0/16
  if (a === 169 && b === 254) return true;
  // private 10.0.0.0/8
  if (a === 10) return true;
  // private 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // private 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // "this network" 0.0.0.0/8 — 0.0.0.1 and friends also route to local on some stacks
  if (a === 0) return true;
  // carrier-grade NAT 100.64.0.0/10 — internal in most cloud networks
  if (a === 100 && b >= 64 && b <= 127) return true;
  // IETF protocol assignments 192.0.0.0/24
  if (a === 192 && b === 0 && c === 0) return true;
  // benchmarking 198.18.0.0/15
  if (a === 198 && (b === 18 || b === 19)) return true;
  // multicast 224.0.0.0/4 and reserved/broadcast 240.0.0.0/4
  if (a >= 224) return true;
  return false;
};

/**
 * True for IPv6 addresses that are not routable public space, including the
 * IPv4-mapped and IPv4-compatible forms that smuggle a restricted IPv4 address
 * through an IPv6 literal.
 */
export const isNonRoutableIPv6 = (ip: string): boolean => {
  const lower = ip.toLowerCase();

  // loopback ::1 / unspecified ::
  if (lower === '::1' || lower === '::') return true;

  // link-local fe80::/10
  if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true;

  // unique-local fc00::/7 (fc and fd prefixes)
  if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return true;

  // IPv4-mapped  ::ffff:<ipv4>  and IPv4-compatible  ::<ipv4>
  // Forms seen in the wild:
  //   ::ffff:169.254.169.254   (dotted)
  //   ::ffff:a9fe:a9fe         (two hex groups)
  //   ::ffff:0:169.254.169.254 (alternative mapped prefix)
  //   ::169.254.169.254        (IPv4-compatible, deprecated but still parsed)
  const mappedDotted = lower.match(/^::(?:ffff:(?:0:)?)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedDotted) {
    return isNonRoutableIPv4(mappedDotted[1]);
  }
  // ::ffff:<hi>:<lo> — IPv4-mapped (canonical form from URL parser for e.g. ::ffff:169.254.169.254)
  const mappedFfff = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedFfff) {
    return isNonRoutableIPv4(hexGroupsToDotted(mappedFfff[1], mappedFfff[2]));
  }

  // ::<hi>:<lo> — IPv4-compatible (deprecated; URL parser converts ::169.254.169.254 → ::a9fe:a9fe).
  // Only match the exact two-group-after-:: form to avoid false-positives on normal short IPv6.
  const compatHex = lower.match(/^::([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (compatHex) {
    return isNonRoutableIPv4(hexGroupsToDotted(compatHex[1], compatHex[2]));
  }

  return false;
};
