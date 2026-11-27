/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OsqueryRow } from './normalize';

/*
 * Maps an osquery Windows `os_version` row to the MSRC CVRF product id whose fixed builds
 * apply to it: one product per Windows version and architecture, no edition in it.
 *
 * `arch` and `name` are localized by the OS ("64 bits", "Microsoft Windows 10 Professionnel"),
 * so `arch` is parsed by digits and `name` is only a cross-check. `build` and `revision` (the
 * registry UBR) are numeric and are the real key. A host that cannot be placed exactly gets a
 * reason instead of a guess.
 */

export type WindowsArch = 'x64' | 'arm64' | 'x86';

interface WindowsProduct {
  /** `Windows 10 22H2`, for reasons. */
  label: string;
  /** Product id by architecture; absent when MSRC publishes no such product. */
  ids: Readonly<Partial<Record<WindowsArch, string>>>;
}

/**
 * Verified against the Jul, Sep, Oct and Nov 2026 CVRF documents (product name, `10.0.<build>`
 * prefix and arch suffix agreed for every id). Server Core has its own ids (11572, 11924,
 * 12437) but `os_version` cannot tell it from Desktop Experience and MSRC lists the same
 * `FixedBuild` for both, so the Desktop id stands for both.
 */
const WINDOWS_10_22H2: WindowsProduct = {
  label: 'Windows 10 22H2',
  ids: { x64: '12097', arm64: '12098', x86: '12099' },
};
const WINDOWS_11_23H2: WindowsProduct = {
  label: 'Windows 11 23H2',
  ids: { x64: '12243', arm64: '12242' },
};
const WINDOWS_11_24H2: WindowsProduct = {
  label: 'Windows 11 24H2',
  ids: { x64: '12390', arm64: '12389' },
};
const WINDOWS_11_25H2: WindowsProduct = {
  label: 'Windows 11 25H2',
  ids: { x64: '20438', arm64: '20437' },
};
const WINDOWS_SERVER_2019: WindowsProduct = {
  label: 'Windows Server 2019',
  ids: { x64: '11571' },
};
const WINDOWS_SERVER_2022: WindowsProduct = {
  label: 'Windows Server 2022',
  ids: { x64: '11923' },
};
const WINDOWS_SERVER_2025: WindowsProduct = {
  label: 'Windows Server 2025',
  ids: { x64: '12436' },
};

const PRODUCT_BY_BUILD: ReadonlyMap<number, WindowsProduct> = new Map([
  [19045, WINDOWS_10_22H2],
  [22631, WINDOWS_11_23H2],
  [26200, WINDOWS_11_25H2],
  [17763, WINDOWS_SERVER_2019],
  [20348, WINDOWS_SERVER_2022],
]);

/**
 * Windows 11 24H2 and Windows Server 2025 share build 26100. Their UBR lines do not overlap
 * (Server 2025 is 33xxx, 24H2 is 9xxx at the time of writing), so the UBR picks the product.
 */
const BUILD_24H2_AND_SERVER_2025 = 26100;
const SERVER_2025_MIN_UBR = 30000;

/**
 * Windows Server 2019 shares build 17763 with Windows 10 1809 and 10 LTSC 2019, which MSRC
 * lists under other product ids that are not mapped. Neither UBR nor arch tells them apart, so
 * the English "Server" in the OS name decides, and a name without it (Windows 10, localized,
 * empty) is unsupported rather than guessed.
 */
const BUILD_SERVER_2019_AND_WINDOWS_10_1809 = 17763;

export interface WindowsOsProduct {
  productId: string;
  arch: WindowsArch;
  /** The third component of `10.0.<build>.<ubr>`. */
  build: number;
  ubr: number;
  /** `10.0.<build>.<ubr>`: what the host runs, to compare with an advisory's `fixedBuild`. */
  installedBuild: string;
  label: string;
}

export type WindowsOsProductResult =
  | { ok: true; product: WindowsOsProduct }
  | { ok: false; reason: string };

const text = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/** A non-negative integer written in plain digits; osquery sends numbers as strings or numbers. */
const wholeNumber = (value: unknown): number | undefined => {
  const raw = text(value);
  return raw !== undefined && /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw))
    ? Number(raw)
    : undefined;
};

/**
 * "64-bit", "64 bits", "ARM 64-bit Processor" -> by the digits, not the English words.
 * ARM must be checked first because it carries "64" too. Anything else is not guessed.
 */
export const parseWindowsArch = (arch: unknown): WindowsArch | undefined => {
  const value = text(arch)?.toUpperCase();
  if (!value) return undefined;
  if (value.includes('ARM') && value.includes('64')) return 'arm64';
  if (value.includes('64')) return 'x64';
  if (value.includes('32') || value.includes('86')) return 'x86';
  return undefined;
};

const fail = (reason: string): WindowsOsProductResult => ({ ok: false, reason });

/**
 * Resolves a Windows `os_version` row (`build`, `revision`, `arch`, `name`) to its MSRC
 * product. The `reason` of a failure names what was missing or contradictory; the caller
 * records the host as `unsupported_os`.
 */
export const resolveWindowsOsProduct = (row: OsqueryRow): WindowsOsProductResult => {
  const build = wholeNumber(row.build);
  if (build === undefined) return fail('no build number');
  const ubr = wholeNumber(row.revision);
  if (ubr === undefined || ubr === 0) return fail('no UBR (os_version revision is empty or 0)');
  const arch = parseWindowsArch(row.arch);
  if (!arch) return fail(`unrecognised architecture ${JSON.stringify(text(row.arch) ?? '')}`);

  let product: WindowsProduct | undefined;
  if (build === BUILD_24H2_AND_SERVER_2025) {
    const isServer = ubr >= SERVER_2025_MIN_UBR;
    product = isServer ? WINDOWS_SERVER_2025 : WINDOWS_11_24H2;
    const name = text(row.name);
    // Only the English tokens count: a localized name with neither token cannot contradict.
    const claimsServer = name?.includes('Server') ?? false;
    const claimsClient = name?.includes('Windows 11') ?? false;
    if ((isServer && claimsClient && !claimsServer) || (!isServer && claimsServer)) {
      return fail(
        `build 26100 revision ${ubr} is ${product.label} but the OS name is ${JSON.stringify(name)}`
      );
    }
  } else {
    product = PRODUCT_BY_BUILD.get(build);
    if (
      build === BUILD_SERVER_2019_AND_WINDOWS_10_1809 &&
      !(text(row.name)?.includes('Server') ?? false)
    ) {
      return fail(
        `build 17763 is Windows Server 2019 or Windows 10 1809, and the OS name ${JSON.stringify(
          text(row.name) ?? ''
        )} does not say Server`
      );
    }
  }
  if (!product) return fail(`build ${build} is not a supported Windows version`);

  const productId = product.ids[arch];
  if (!productId) return fail(`${product.label} has no ${arch} product`);
  return {
    ok: true,
    product: {
      productId,
      arch,
      build,
      ubr,
      installedBuild: `10.0.${build}.${ubr}`,
      label: product.label,
    },
  };
};
