/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Special-use IPv4 and IPv6 range classification, shared by the callers that
 * need it so their definitions cannot drift:
 *
 *   - `security_solution` SSRF HTTP client rejects these as fetch targets.
 *   - `security_solution` `extract_iocs` tiers them as `reference` rather than
 *     treating them as candidate C2 anchors.
 *   - Hunt eligibility (`isHuntEligibleIoc`) drops `ip` / `cidr` values in these
 *     ranges even when a legacy stored doc has no tier or a promotable tier, so
 *     loopback / private hits cannot confirm a hunt on their own.
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
  // Azure platform VIP 168.63.129.16/32 (WireServer / host plugin).
  //
  // This one is not in any RFC special-use range: it is ordinary public space that
  // Azure routes only inside the VM, so every rule above passes it. On an Azure
  // deployment it answers VM-scoped platform requests, and the fetch client lets a
  // caller supply arbitrary headers, so an untrusted source document could reach it.
  // The other cloud metadata endpoints sit in link-local 169.254.0.0/16 and are
  // already covered.
  if (a === 168 && b === 63 && c === 129 && Number(ip.split('.')[3]) === 16) return true;
  return false;
};

/**
 * Rewrites an IPv6 literal to the WHATWG canonical form (compressed, lowercase,
 * no brackets, dotted IPv4 suffix converted to hex groups). Stored IOC values are
 * not normalised by a URL parser the way SSRF targets are, so `0:0:0:0:0:0:0:1`
 * and `[::1]` must reach the prefix tests below as `::1`. Only pure address
 * characters are handed to the URL parser, so a value carrying URL syntax cannot
 * parse into a different host. Anything else, or input the parser rejects (zone
 * ids, garbage), is returned lowercased and unchanged.
 */
const canonicalIPv6 = (ip: string): string => {
  const lower = ip.toLowerCase();
  const bare = lower.startsWith('[') && lower.endsWith(']') ? lower.slice(1, -1) : lower;
  if (!/^[0-9a-f:.]+$/.test(bare)) {
    return bare;
  }
  try {
    return new URL(`http://[${bare}]/`).hostname.slice(1, -1);
  } catch {
    return bare;
  }
};

/**
 * True for IPv6 addresses that are not routable public space, including the
 * IPv4-mapped and IPv4-compatible forms that smuggle a restricted IPv4 address
 * through an IPv6 literal. Accepts expanded and bracketed spellings.
 */
export const isNonRoutableIPv6 = (ip: string): boolean => {
  const lower = canonicalIPv6(ip);

  // loopback ::1 / unspecified ::
  if (lower === '::1' || lower === '::') return true;

  // link-local fe80::/10
  if (/^fe[89ab][0-9a-f]:/i.test(lower)) return true;

  // unique-local fc00::/7 (fc and fd prefixes)
  if (/^f[cd][0-9a-f]{2}:/i.test(lower)) return true;

  // site-local fec0::/10. Deprecated by RFC 3879 but still routed on some
  // networks, and `fe[89ab]` above only covers fe80::/10.
  if (/^fe[c-f][0-9a-f]:/i.test(lower)) return true;

  // multicast ff00::/8. Not a meaningful TCP target, but it is not public space
  // either, and an IOC in this range is noise rather than a C2 anchor.
  if (/^ff[0-9a-f]{2}:/i.test(lower)) return true;

  // Transition and special-purpose prefixes that can carry a restricted IPv4
  // address inside an otherwise public-looking IPv6 literal:
  //   2002::/16      6to4, encodes the IPv4 in the next two groups
  //   64:ff9b::/96   NAT64 well-known prefix, encodes it in the low 32 bits
  //   64:ff9b:1::/48 NAT64 local-use prefix (RFC 8215)
  //
  // The NAT64 test matches 64:ff9b::/32, which is wider than either prefix. That is
  // deliberate: it covers both assignments in one check, and the rest of the /32 is
  // unassigned, so over-blocking it costs nothing and fails closed.
  //
  // These are blocked wholesale rather than parsed for the embedded address.
  // Parsing means getting the compressed-zero cases right (`2002::` is a valid
  // way to write an embedded 0.0.0.0), and there is no upside: 6to4 is
  // deprecated by RFC 7526 and no real threat feed is served over either
  // prefix, so failing closed on the whole range costs nothing.
  if (/^2002:/i.test(lower)) return true;
  if (/^64:ff9b:/i.test(lower)) return true;

  // discard-only 100::/64, documentation 2001:db8::/32, benchmarking 2001:2::/48
  if (/^100::/i.test(lower)) return true;
  if (/^2001:db8:/i.test(lower)) return true;
  // /48, so the third group must be zero. It appears either swallowed by `::` or
  // written out explicitly; `/^2001:2:/` alone would match the whole /32 and
  // wrongly classify e.g. 2001:2:1::1.
  if (/^2001:2:(?:0:|:)/i.test(lower)) return true;

  // IPv4-mapped  ::ffff:<ipv4>  and IPv4-compatible  ::<ipv4>
  // Forms seen in the wild:
  //   ::ffff:169.254.169.254   (dotted)
  //   ::ffff:a9fe:a9fe         (two hex groups)
  //   ::ffff:0:169.254.169.254 (alternative mapped prefix)
  //   ::169.254.169.254        (IPv4-compatible, deprecated but still parsed)
  const mappedDotted = lower.match(/^::(?:(?:0|ffff):)*(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedDotted) {
    return isNonRoutableIPv4(mappedDotted[1]);
  }
  // Hex spelling of an embedded IPv4, which is what the URL parser actually produces:
  // it converts any dotted suffix to hex groups, so the dotted matcher above never
  // sees a host that came from a URL.
  //
  // Matched by shape rather than by enumerating spellings. All leading groups are
  // zero (`::`), any intervening groups are only the mapped marker `ffff` or further
  // zeros, and the last two groups carry the address. That covers every form in use:
  //
  //   ::ffff:a9fe:a9fe     IPv4-mapped            (from ::ffff:169.254.169.254)
  //   ::ffff:0:a9fe:a9fe   IPv4-translatable/SIIT (from ::ffff:0:169.254.169.254)
  //   ::a9fe:a9fe          IPv4-compatible        (from ::169.254.169.254)
  //
  // Enumerating them individually already missed the SIIT form once, and because a
  // literal host skips DNS validation entirely, a miss here is a direct route to the
  // embedded target rather than a defence-in-depth gap.
  const embedded = lower.match(/^::((?:(?:0|ffff):)*)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (embedded) {
    return isNonRoutableIPv4(hexGroupsToDotted(embedded[2], embedded[3]));
  }

  return false;
};

const IPV4_DOTTED = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const hasValidOctets = (ip: string): boolean =>
  ip.split('.').every((octet) => Number(octet) <= 255);
/**
 * Leading IPv4 with an optional `:port`. Unanchored on purpose: free-form extracts
 * sometimes append junk (`127.0.0.1:443junk`, `10.0.0.5extra`), and the address
 * check still applies to the dotted-quad prefix. The last octet may not run into
 * more digits, so `203.0.113.1000` is not read as `203.0.113.100`.
 */
const IPV4_DOTTED_OPTIONAL_PORT_PREFIX = /^((?:\d{1,3}\.){3}\d{1,3})(?!\d)(?::\d+)?/;

/**
 * Host portion of a stored `ip` / `cidr` value for range classification. Strips a
 * CIDR suffix (for either type: a legacy `ip` of `127.0.0.1/32` still needs the
 * address check), an IPv4 `:port` (and trailing junk after it), and IPv6 brackets
 * (`[addr]`, `[addr]:port`, or `[addr]` with trailing junk). Bracket unwrap takes
 * the first `]` only so a value like `[fe80::1]:80@[2606::1]` cannot keep the
 * link-local address hidden behind trailing URL syntax.
 */
const hostForIpIocValue = (raw: string): string => {
  const slash = raw.indexOf('/');
  const host = slash !== -1 ? raw.slice(0, slash) : raw;
  if (host.startsWith('[')) {
    const end = host.indexOf(']');
    if (end > 1) {
      return host.slice(1, end);
    }
  }
  const ipv4 = host.match(IPV4_DOTTED_OPTIONAL_PORT_PREFIX);
  if (ipv4) {
    return ipv4[1];
  }
  return host;
};

/**
 * True when a stored `ip` or `cidr` IOC value sits in non-routable space. A CIDR is
 * judged by its network address, which is the same rule `extract_iocs` applies when
 * it tiers a range. Other IOC types and unparseable values are never non-routable.
 */
export const isNonRoutableIpIoc = (ioc: { type?: unknown; value?: unknown }): boolean => {
  if (typeof ioc.value !== 'string' || (ioc.type !== 'ip' && ioc.type !== 'cidr')) {
    return false;
  }
  const raw = ioc.value.trim();
  if (raw.length === 0) {
    return false;
  }
  const host = hostForIpIocValue(raw);
  if (IPV4_DOTTED.test(host)) {
    return hasValidOctets(host) && isNonRoutableIPv4(host);
  }
  if (host.includes(':')) {
    return isNonRoutableIPv6(host);
  }
  return false;
};
