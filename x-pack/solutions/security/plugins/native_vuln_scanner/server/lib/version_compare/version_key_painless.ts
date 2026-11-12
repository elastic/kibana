/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Ingest-time painless port of dpkgKey / rpmKey. Its output must stay byte-identical to the TS
 * keys; the version_key_parity integration test checks that against a real Elasticsearch.
 */
export const VERSION_KEY_PAINLESS = `// Reads ctx.package.version + ctx.package.version_scheme ("dpkg" | "rpm").
// Writes ctx.package.version_key, or ctx.package.version_key_error when the
// version cannot be encoded (the TS code throws UnencodableVersionError there).
// Key bytes are printable ASCII, so keyword byte order == dpkg/rpm order.

boolean isDigit(int c) { return c >= 48 && c <= 57; }
boolean isAlpha(int c) { return (c >= 65 && c <= 90) || (c >= 97 && c <= 122); }

// Length char (0x30 + digit count, leading zeros stripped) then the digits.
String encNum(String digits) {
  int k = 0;
  while (k < digits.length() && digits.charAt(k) == (char) '0') { k++; }
  String d = digits.substring(k);
  if (d.length() > 78) { return null; }
  return String.valueOf((char) (48 + d.length())) + d;
}

// Number.parseInt(s, 10) || 0 in JS: optional sign, leading digits, else 0.
long parseEpoch(String s) {
  int i = 0;
  boolean neg = false;
  if (i < s.length() && (s.charAt(i) == (char) '-' || s.charAt(i) == (char) '+')) {
    neg = s.charAt(i) == (char) '-';
    i++;
  }
  long v = 0;
  while (i < s.length() && isDigit(s.charAt(i))) { v = v * 10 + (s.charAt(i) - 48); i++; }
  return neg ? -v : v;
}

String dpkgRuns(String s) {
  StringBuilder out = new StringBuilder();
  int n = s.length();
  int i = 0;
  while (true) {
    while (i < n && !isDigit(s.charAt(i))) {
      int c = s.charAt(i);
      if (c == 126) { out.append('!'); }
      else if (isAlpha(c)) { out.append((char) c); }
      else if (c == 43) { out.append('{'); }
      else if (c == 45) { out.append('|'); }
      else if (c == 46) { out.append('}'); }
      else if (c == 58) { out.append('~'); }
      else { return null; }
      i++;
    }
    out.append('"');
    int st = i;
    while (i < n && isDigit(s.charAt(i))) { i++; }
    String e = encNum(s.substring(st, i));
    if (e == null) { return null; }
    out.append(e);
    if (i >= n) { break; }
  }
  out.append('"');
  return out.toString();
}

String rpmVer(String s) {
  StringBuilder out = new StringBuilder();
  int n = s.length();
  int i = 0;
  while (i < n) {
    int c = s.charAt(i);
    if (c == 126) { out.append('!'); i++; }
    else if (c == 94) { out.append('#'); i++; }
    else if (isDigit(c)) {
      int st = i;
      while (i < n && isDigit(s.charAt(i))) { i++; }
      String e = encNum(s.substring(st, i));
      if (e == null) { return null; }
      out.append('+').append(e);
    } else if (isAlpha(c)) {
      int st = i;
      while (i < n && isAlpha(s.charAt(i))) { i++; }
      out.append('*').append(s.substring(st, i)).append(' ');
    } else { i++; }
  }
  out.append('"');
  return out.toString();
}

def pkg = ctx.package;
if (pkg == null || pkg.version == null || pkg.version_scheme == null) { return; }
String raw = pkg.version.trim();
String scheme = pkg.version_scheme;
if (scheme != 'dpkg' && scheme != 'rpm') {
  pkg.version_key_error = 'unsupported scheme';
  return;
}
int colon = raw.indexOf(':');
long epoch = colon >= 0 ? parseEpoch(raw.substring(0, colon)) : 0L;
String rest = colon >= 0 ? raw.substring(colon + 1) : raw;
int dash = rest.lastIndexOf('-');
String a = dash >= 0 ? rest.substring(0, dash) : rest;
String b = dash >= 0 ? rest.substring(dash + 1) : '';

String ep = encNum(String.valueOf(epoch));
String ka = scheme == 'dpkg' ? dpkgRuns(a) : rpmVer(a);
String kb = scheme == 'dpkg' ? dpkgRuns(b) : rpmVer(b);
if (ep == null || ka == null || kb == null) {
  pkg.version_key_error = 'unencodable';
  return;
}
pkg.version_key = ep + ka + kb;
`;

/** Ingest processor that sets package.version_key (or package.version_key_error). */
export const versionKeyProcessor = {
  script: { lang: 'painless', source: VERSION_KEY_PAINLESS },
} as const;
