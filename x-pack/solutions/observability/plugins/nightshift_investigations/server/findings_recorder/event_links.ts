/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IMPACT_MAP_EVENT_KINDS } from '@kbn/agentic-investigations-plugin/common';

/** `[words](event:<id>)`: the recorder's way of pointing at an event. */
const EVENT_LINK = /\[([^\]]*)\]\(event:([^)\s]*)\)/g;

/** `<kind>:<target>:<YYYY-MM-DDTHH:MM>`, which is how an event's id is made. */
const EVENT_ID = /^([a-z_]+):(.+):(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/;

const KINDS: readonly string[] = IMPACT_MAP_EVENT_KINDS;

/**
 * Keeps the event links the recorder wrote and puts each id in the form the store makes (the
 * time to the minute), so a slip such as seconds or a trailing Z still finds its event. A link
 * that is not shaped like an event id is turned back into its words, so the reader never meets a
 * dead link. Whether the event exists is the screen's to check: it may be an earlier pass's.
 */
export const normalizeEventLinks = (text: string): string =>
  text.replace(EVENT_LINK, (_match, words: string, rawId: string) => {
    const parsed = EVENT_ID.exec(rawId.trim());
    if (!parsed || !KINDS.includes(parsed[1]) || !words.trim()) {
      return words;
    }
    const [, kind, target, time] = parsed;
    return `[${words}](event:${kind}:${target}:${time})`;
  });
