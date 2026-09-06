/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import xml2js from 'xml2js';

/**
 * Resolved payload of a feed entry's description/content, disambiguated once here where
 * the feed's XML structure and namespace declarations are visible. The adapter never needs
 * to know whether this was entity-encoded HTML, inline XML child elements, or CDATA — only
 * the markup/text distinction survives, since that's the one decision it still makes:
 * whether to convert the fragment to bounded plain text (`markup`) or use it as-is (`text`).
 */
export type EntryBody = { kind: 'markup'; html: string } | { kind: 'text'; text: string };

/**
 * Format-agnostic representation of a single feed entry, so the adapter doesn't branch on
 * RSS 2.0 vs Atom vs RDF past this point. `id` is the most stable identifier the feed
 * exposes (Atom `<id>`, RSS `<guid>`, falling back to `<link>`) and seeds the per-item
 * `content_fingerprint` — two items sharing both `id` and title collapse to one
 * fingerprint, which is the intended dedup for RSS-syndicated copies of one advisory.
 */
export interface RssEntry {
  id: string;
  title: string;
  link?: string;
  /** ISO-8601 string when the feed exposes a publish/update timestamp. */
  publishedAt?: string;
  /** Undefined when the feed provides no description/content/summary at all. */
  body?: EntryBody;
}

export interface ParsedFeed {
  /** Normalized feed-level title. Empty string when the feed declares no title. */
  feedTitle: string;
  /** Lowercased ISO-639-1 if the feed declares one (`<language>` / `xml:lang`). */
  language?: string;
  entries: RssEntry[];
}

/**
 * Parses an RSS 2.0, Atom, or RDF feed. Tolerant by design — feeds in the wild violate
 * every spec at least sometimes, so the structure is treated as advisory. Items missing
 * every identifying field (`id`/`guid`/`link`) are dropped, since there's no stable
 * fingerprint seed and keeping them would create a fresh row every run forever.
 */
export const parseRssFeed = async (xml: string): Promise<ParsedFeed> => {
  const trimmed = xml.trim();
  if (!trimmed) return { feedTitle: '', entries: [] };

  // `explicitArray: true` makes every child accessor an array, avoiding `Array.isArray`
  // branches below. `explicitChildren`/`preserveChildrenOrder`/`charsAsChildren`/
  // `includeWhiteChars` add an ordered `$$` child list (element and text, in position)
  // alongside the by-name-grouped arrays — needed to capture and re-serialize an Atom
  // `type="xhtml"` construct's real child markup rather than losing its structure to the
  // by-name shape's concatenated text.
  //
  // Deliberately NOT using xml2js's own `xmlns: true`: it couples to the SAX parser's
  // strict mode, which throws on an undeclared namespace prefix — and real feeds routinely
  // use `dc:`/`content:` with no declaration in scope, which is exactly the violation this
  // parser exists to tolerate. Namespace resolution for the one case that needs it
  // (`content:encoded` under an aliased prefix) is done separately below.
  const parsed = await xml2js.parseStringPromise(trimmed, {
    explicitArray: true,
    explicitCharkey: true,
    charkey: '_',
    attrkey: '$',
    trim: false,
    normalizeTags: false,
    explicitChildren: true,
    preserveChildrenOrder: true,
    charsAsChildren: true,
    includeWhiteChars: true,
    childkey: '$$',
  });

  // Atom: <feed xmlns="http://www.w3.org/2005/Atom">
  if (parsed.feed) return parseAtom(parsed.feed);
  // RSS 2.0: <rss><channel>...</channel></rss>
  if (parsed.rss?.channel?.[0]) {
    // `xmlns:*` declarations for a module like Content commonly sit on the outermost
    // <rss> element, one level above <channel>, so the root's own attributes have to
    // seed the scope before descending — `parseRss2` never sees <rss> itself otherwise.
    const rootScope = extendScope(EMPTY_SCOPE, (parsed.rss as XmlNode).$);
    return parseRss2(parsed.rss.channel[0], rootScope);
  }
  // RDF / RSS 1.0: <rdf:RDF><channel/><item/>...</rdf:RDF>
  const rdfRoot = parsed['rdf:RDF'] ?? parsed.RDF ?? parsed['rss:RDF'] ?? undefined;
  if (rdfRoot) return parseRdf(rdfRoot);

  return { feedTitle: '', entries: [] };
};

interface XmlChildNode {
  '#name'?: string;
  _?: string;
  $?: Record<string, string>;
  $$?: XmlChildNode[];
}

interface XmlNode {
  $?: Record<string, string>;
  $$?: XmlChildNode[];
  _?: string;
  [key: string]: unknown;
}

/** Best-effort string extraction from xml2js's nested array+object shape. */
const text = (node: unknown): string => {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return text(node[0]);
  if (typeof node === 'object') {
    const obj = node as XmlNode;
    if (typeof obj._ === 'string') return obj._;
    // Atom <link href="…"/> uses an attribute-only shape.
    if (obj.$ && typeof obj.$.href === 'string') return obj.$.href;
  }
  return '';
};

const firstAttr = (node: unknown, attr: string): string | undefined => {
  if (Array.isArray(node)) return firstAttr(node[0], attr);
  if (node && typeof node === 'object') {
    const obj = node as XmlNode;
    return obj.$?.[attr];
  }
  return undefined;
};

const toIsoDate = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const ms = Date.parse(trimmed);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
};

const pickLanguage = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  // `en-US` / `en_us` → `en`. Lowercasing matches ECS' `language`
  // field convention used by downstream mappers.
  const head = raw.split(/[-_]/)[0];
  return head ? head.toLowerCase() : undefined;
};

const dropEmpty = (entries: RssEntry[]): RssEntry[] =>
  // Items without any identifier would generate a fresh fingerprint on
  // every run, defeating the dedup gate. Better to drop them than to
  // pollute the reports index.
  entries.filter((entry) => entry.id && (entry.title || entry.body));

const markupBody = (html: string | undefined): EntryBody | undefined =>
  html ? { kind: 'markup', html } : undefined;

// --- RSS Content Module (content:encoded) namespace resolution ------------------------

const CONTENT_MODULE_NS = 'http://purl.org/rss/1.0/modules/content/';

/**
 * `prefix -> namespace URI`, accumulated top-down from `xmlns`/`xmlns:*` attributes.
 * Empty string is the key for the default (unprefixed) namespace.
 */
type NamespaceScope = ReadonlyMap<string, string>;

const EMPTY_SCOPE: NamespaceScope = new Map();

/** Extends `scope` with any `xmlns`/`xmlns:*` declarations on this node's attributes. */
const extendScope = (
  scope: NamespaceScope,
  attrs: Record<string, string> | undefined
): NamespaceScope => {
  if (!attrs) return scope;
  const declared = Object.entries(attrs).filter(
    ([name]) => name === 'xmlns' || name.startsWith('xmlns:')
  );
  if (declared.length === 0) return scope;
  const next = new Map(scope);
  for (const [name, uri] of declared) {
    next.set(name === 'xmlns' ? '' : name.slice('xmlns:'.length), uri);
  }
  return next;
};

/**
 * Finds a child of `parent` (from its by-name-grouped keys, not `$$`) whose local name
 * (the part after `:`, or the whole key if unprefixed) matches `localName`, and returns
 * its qualified key alongside the first element. Used to find `content:encoded` under
 * whatever prefix a feed actually used, including a non-conventional alias.
 */
const findChildByLocalName = (
  parent: XmlNode,
  localName: string
): { qualifiedName: string; node: XmlNode } | undefined => {
  const candidateKeys = Object.keys(parent).filter((key) => {
    if (key === '$' || key === '_' || key === '$$') return false;
    const colon = key.indexOf(':');
    const local = colon > 0 ? key.slice(colon + 1) : key;
    return local === localName;
  });

  for (const key of candidateKeys) {
    const value = parent[key];
    const node = Array.isArray(value) ? value[0] : value;
    if (node && typeof node === 'object') return { qualifiedName: key, node: node as XmlNode };
  }
  return undefined;
};

/**
 * Resolves the RSS Content Module's `encoded` element, under any prefix, and returns its
 * text when found. The conventional `content:` prefix is accepted even when undeclared,
 * since feeds that use it virtually always mean the Content Module; any other prefix has
 * to actually resolve, via an `xmlns:` declaration on the item or document root, to the
 * module's namespace URI.
 */
const resolveContentEncoded = (item: XmlNode, rootScope: NamespaceScope): string | undefined => {
  const found = findChildByLocalName(item, 'encoded');
  if (!found) return undefined;

  const colon = found.qualifiedName.indexOf(':');
  const prefix = colon > 0 ? found.qualifiedName.slice(0, colon) : '';
  if (prefix === 'content') return text(found.node);

  // The declaration can sit on the item, or on the found element itself — both are valid
  // XML, and a declaration on the element only ever widens the scope for the check below.
  const scope = extendScope(extendScope(rootScope, item.$), found.node.$);
  if (scope.get(prefix) === CONTENT_MODULE_NS) return text(found.node);

  return undefined;
};

// --- Atom text-construct type resolution -----------------------------------------------

type AtomContentKind = 'text' | 'html' | 'inline-xml';

/**
 * RFC 4287 §4.1.3: `title`/`summary`/`rights`/`subtitle` take `text`|`html`|`xhtml`.
 * `content` additionally accepts any MIME type, of which `text/html` is the encoded-markup
 * case and anything ending `+xml` (or `text/xml`/`application/xml`) is inline XML markup,
 * same as the `xhtml` shorthand. Unrecognized or absent types default to `text` — preserving
 * content rather than deleting it.
 */
const resolveAtomContentKind = (rawType: string | undefined): AtomContentKind => {
  const type = (rawType ?? 'text').split(';', 1)[0].trim().toLowerCase();
  if (type === 'html' || type === 'text/html') return 'html';
  if (
    type === 'xhtml' ||
    type === 'text/xml' ||
    type === 'application/xml' ||
    type.endsWith('+xml')
  ) {
    return 'inline-xml';
  }
  return 'text';
};

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
const escapeText = (value: string): string => value.replace(/[&<>]/g, (c) => HTML_ESCAPES[c]);

const ATTR_ESCAPES: Record<string, string> = { '&': '&amp;', '"': '&quot;', '<': '&lt;' };
const escapeAttr = (value: string): string => value.replace(/[&"<]/g, (c) => ATTR_ESCAPES[c]);

/**
 * Re-serializes an xml2js `explicitChildren` subtree into an HTML string.
 * `xml2js.Builder` can't do this — it throws `Invalid character in name`, since it
 * iterates the `$$`/`#name` bookkeeping keys as if they were element names.
 * `#name: '__text__'` marks a text run (added by `charsAsChildren`); anything else is an
 * element.
 */
const serializeXmlNode = (node: XmlChildNode): string => {
  const name = node['#name'];
  if (name === undefined || name === '__text__') return escapeText(node._ ?? '');

  const attrs = Object.entries(node.$ ?? {})
    .filter(([attrName]) => attrName !== 'xmlns' && !attrName.startsWith('xmlns:'))
    .map(([attrName, value]) => ` ${attrName}="${escapeAttr(value)}"`)
    .join('');

  const children = node.$$ ?? [];
  return `<${name}${attrs}>${children.map(serializeXmlNode).join('')}</${name}>`;
};

/**
 * Serializes the child markup of an xhtml/inline-XML Atom text construct back into an HTML
 * string, so downstream HTML processing sees ordinary markup and never needs to know this
 * started life as inline XML rather than entity-encoded HTML.
 */
const serializeInlineXmlContent = (node: XmlChildNode): string =>
  (node.$$ ?? []).map(serializeXmlNode).join('');

/** Resolves an Atom `<content>`/`<summary>` node into its disambiguated body payload. */
const resolveTextConstruct = (node: XmlChildNode | undefined): EntryBody | undefined => {
  if (node === undefined) return undefined;
  const kind = resolveAtomContentKind(firstAttr(node, 'type'));

  if (kind === 'text') {
    const value = (node._ ?? '').trim();
    return value ? { kind: 'text', text: value } : undefined;
  }
  if (kind === 'html') {
    // Already entity-decoded by xml2js's own XML parse.
    return markupBody((node._ ?? '').trim() || undefined);
  }
  // 'inline-xml': RFC 4287 requires exactly one child element (typically xhtml:div).
  return markupBody(serializeInlineXmlContent(node).trim() || undefined);
};

// --- Per-format parsing -------------------------------------------------------------------

const parseRss2 = (channel: XmlNode, rssRootScope: NamespaceScope): ParsedFeed => {
  const rootScope = extendScope(rssRootScope, channel.$);
  const items = (channel.item as XmlNode[] | undefined) ?? [];
  const entries: RssEntry[] = items.map((item) => {
    const guid = text(item.guid);
    const link = text(item.link);
    const id = guid || link || text(item.id);
    const title = text(item.title);
    const description = text(item.description);
    // <content:encoded> ships the full HTML article body when the
    // feed wants to provide more than the summary. Some feeds use it,
    // some don't — fall back to the description.
    const contentEncoded = resolveContentEncoded(item, rootScope);
    const publishedAt =
      toIsoDate(text(item.pubDate)) ?? toIsoDate(text((item as XmlNode)['dc:date']));
    return {
      id,
      title,
      link: link || undefined,
      publishedAt,
      body: markupBody(contentEncoded || description || undefined),
    };
  });
  return {
    feedTitle: text(channel.title),
    language: pickLanguage(text(channel.language)),
    entries: dropEmpty(entries),
  };
};

const parseAtom = (feed: XmlNode): ParsedFeed => {
  const entriesRaw = (feed.entry as XmlNode[] | undefined) ?? [];
  const entries: RssEntry[] = entriesRaw.map((entry) => {
    const id = text(entry.id);
    const title = text(entry.title);
    // Atom links can be one or many; we want the first `rel="alternate"`
    // (or the one without a rel attribute, which is how most feeds ship
    // a single canonical link).
    const linkArr = (entry.link as XmlNode[] | undefined) ?? [];
    const link =
      linkArr.find((l) => {
        const rel = firstAttr(l, 'rel');
        return rel === undefined || rel === 'alternate';
      }) ?? linkArr[0];
    const linkHref = firstAttr(link, 'href') ?? text(link);
    const content = ((entry.content as XmlChildNode[] | undefined) ?? [])[0];
    const summary = ((entry.summary as XmlChildNode[] | undefined) ?? [])[0];
    const body = resolveTextConstruct(content) ?? resolveTextConstruct(summary);
    const publishedAt = toIsoDate(text(entry.updated)) ?? toIsoDate(text(entry.published));
    return {
      id: id || linkHref,
      title,
      link: linkHref || undefined,
      publishedAt,
      body,
    };
  });
  return {
    feedTitle: text(feed.title),
    language: pickLanguage(firstAttr(feed, 'xml:lang')),
    entries: dropEmpty(entries),
  };
};

const parseRdf = (rdf: XmlNode): ParsedFeed => {
  // RSS 1.0 puts items as siblings of <channel> at the RDF root rather
  // than nested under it; the channel's `<items><rdf:Seq>` only references
  // them by `rdf:about`. We don't need the order — we just walk the
  // siblings.
  const rootScope = extendScope(EMPTY_SCOPE, rdf.$);
  const channel = ((rdf.channel as XmlNode[] | undefined) ?? [])[0] ?? {};
  const items = (rdf.item as XmlNode[] | undefined) ?? [];
  const entries: RssEntry[] = items.map((item) => {
    const about = firstAttr(item, 'rdf:about') ?? firstAttr(item, 'about');
    const link = text(item.link);
    const id = about || link || text(item.guid);
    const title = text(item.title);
    const description = text(item.description);
    // RSS 1.0's Content Module support, same as parseRss2 — RDF feeds that ship
    // <content:encoded> alongside the bare <description> want the fuller body used.
    const contentEncoded = resolveContentEncoded(item, rootScope);
    const publishedAt =
      toIsoDate(text((item as XmlNode)['dc:date'])) ?? toIsoDate(text(item.pubDate));
    return {
      id,
      title,
      link: link || undefined,
      publishedAt,
      body: markupBody(contentEncoded || description || undefined),
    };
  });
  return {
    feedTitle: text(channel.title),
    language: pickLanguage(text((channel as XmlNode)['dc:language']) || text(channel.language)),
    entries: dropEmpty(entries),
  };
};
