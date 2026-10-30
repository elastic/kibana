/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import fs from 'fs';
// eslint-disable-next-line import/no-nodejs-modules
import path from 'path';

import {
  CHAT_HANDLED_NAVIGATION_INTENTS,
  UI_ONLY_NAVIGATION_INTENTS,
} from '@kbn/security-solution-plugin/server/agent_builder/skills/ui_navigation';

/**
 * The UI-navigation datasets and the product skill both describe which Entity Analytics
 * intents are UI-only. A product decision that moves an intent into chat (new tools, new
 * skill text) used to leave the fixtures behind: every family then scored 0 on an example
 * whose criteria the skill forbids, because the example asserted a redirect for an intent
 * the skill no longer redirects for.
 *
 * These checks read the spec source (it is a Playwright spec, so it cannot be imported into
 * jest) and assert it against the skill's own manifest, so the two cannot drift again:
 *
 *   - every example declares `metadata.ui_only_intent`, and
 *   - every declared id is in the skill's UI_ONLY_NAVIGATION_INTENTS, and
 *   - no declared id, and no example question, asks for a CHAT_HANDLED_NAVIGATION_INTENTS
 *     intent.
 */
const SPEC_PATH = path.resolve(__dirname, '../evals/v2/ea_agent_ui_navigation.spec.ts');

const specSource = fs.readFileSync(SPEC_PATH, 'utf8');

const QUESTIONS = [...specSource.matchAll(/question:\s*(?:`([^`]*)`|'((?:\\.|[^'\\])*)')/g)].map(
  (match) => match[1] ?? match[2]
);

const DECLARED_INTENTS = [...specSource.matchAll(/ui_only_intent:\s*'([^']+)'/g)].map(
  (match) => match[1]
);

const EXAMPLE_COUNT = [...specSource.matchAll(/\binput:\s*\{\s*question:/g)].length;

const UI_ONLY_IDS = new Set<string>(UI_ONLY_NAVIGATION_INTENTS.map((intent) => intent.id));

describe('entity-analytics UI-navigation spec vs the product skill', () => {
  it('has examples to check (guards the source scan itself)', () => {
    expect(EXAMPLE_COUNT).toBeGreaterThan(0);
    expect(QUESTIONS.length).toBeGreaterThan(0);
  });

  it('declares metadata.ui_only_intent on every example', () => {
    expect(DECLARED_INTENTS).toHaveLength(EXAMPLE_COUNT);
  });

  it('only asserts redirects for intents the skill declares UI-only', () => {
    const unknown = DECLARED_INTENTS.filter((id) => !UI_ONLY_IDS.has(id));

    expect(unknown).toEqual([]);
  });

  it('never asserts a redirect for an intent the product performs in chat', () => {
    const chatHandledIds = new Set<string>(
      CHAT_HANDLED_NAVIGATION_INTENTS.map((intent) => intent.id)
    );
    const declaredChatHandled = DECLARED_INTENTS.filter((id) => chatHandledIds.has(id));

    expect(declaredChatHandled).toEqual([]);

    for (const intent of CHAT_HANDLED_NAVIGATION_INTENTS) {
      const asking = QUESTIONS.filter((question) =>
        intent.questionPhrases.some((phrase) =>
          question.toLowerCase().includes(phrase.toLowerCase())
        )
      ).map((question) => `[${intent.id}] ${question}`);

      expect(asking).toEqual([]);
    }
  });

  it('covers every UI-only intent the skill declares', () => {
    const uncovered = UI_ONLY_NAVIGATION_INTENTS.filter(
      (intent) => !DECLARED_INTENTS.includes(intent.id)
    ).map((intent) => intent.id);

    expect(uncovered).toEqual([]);
  });
});
