/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  parseTuningProposal,
  TUNING_BACKTEST_AFTER_LABEL,
  TUNING_BACKTEST_BEFORE_LABEL,
  TUNING_CHANGE_LABEL,
  TUNING_CHANGE_LABEL_V4,
  TUNING_CURRENT_QUERY_LABEL,
  TUNING_PREVIEW_LABEL,
  TUNING_RULE_ID_LABEL,
  TUNING_RULE_NAME_LABEL,
} from '.';

const CURRENT_QUERY = 'process.name : \\"powershell.exe\\"';
const PROPOSED_QUERY = 'process.name : \\"powershell.exe\\" and not user.name : \\"svc-backup\\"';
const RULE_ID = '8f0a1b2c-3d4e-5f60-7182-93a4b5c6d7e8';
const RULE_NAME = 'Endpoint Security [Insights]';

/** The gate message `watch_post_incident.yaml`'s `await_apply_tuning` renders. */
const MESSAGE = `Apply a tuning to detection rule "${RULE_NAME}" (${RULE_ID})?`;

interface AnchoredParts {
  after?: string;
  before?: string;
  change?: string;
  currentQuery?: string;
  ruleId?: string;
  ruleName?: string;
}

/**
 * The reasoning summary `reason_apply_tuning` renders from Detection Watch **v8** on: every
 * recoverable fact behind a stable label, with a `| json`-encoded value, and one alert count per side
 * of a backtest the workflow measured itself.
 *
 * Mirrored from the rendered-text assertions in
 * `kbn-workflows/managed/definitions/pnd/watch_post_incident.test.ts`. That package is
 * `group: platform` and cannot import this one, so the format is pinned on both sides with
 * literals — a drift on either side is a failure here or there, never a silent fall back to the
 * legacy prose reader. The prose between the anchors is reproduced too, because it is what a naive
 * reader would mis-anchor on: it says "as-is" and "as-proposed" in sentences of its own.
 */
const anchoredReasoning = ({
  after = '3',
  before = '95',
  change = '{"enabled":false}',
  currentQuery = `"${CURRENT_QUERY}"`,
  ruleId = `"${RULE_ID}"`,
  ruleName = `"${RULE_NAME}"`,
}: AnchoredParts = {}): string =>
  `Approval writes to a production detection rule. Rule name: ${ruleName}. Rule id: ${ruleId}. Backtest alerts as-is: ${before}. Backtest alerts as-proposed: ${after}. An inconclusive side means the rule preview did not run or did not finish, so there is NO measurement on that side — it does not mean zero alerts. Both sides are inconclusive by design when the proposal changes no query: only a query change alters which documents the rule matches, so there is nothing for a backtest to compare. Proposed change (enabled / investigation_fields / note / query only): ${change}. Rule query as-is: ${currentQuery}. Declining ends the run and changes nothing. The detection engineer's own closing statement follows. I propose disabling the rule.`;

/**
 * The summary Detection Watch **v4 through v7** rendered: the same anchoring, but the change label
 * did not name `query` (it was not tunable yet) and the backtest was one object the model was asked
 * for rather than two counts the workflow measured.
 */
const v4Reasoning = ({
  change = '{"enabled":false}',
  preview = '{"after":{"alertCount":3},"before":{"alertCount":95}}',
}: { change?: string; preview?: string } = {}): string =>
  `Approval writes to a production detection rule. Rule name: "${RULE_NAME}". Rule id: "${RULE_ID}". Proposed change (enabled / investigation_fields / note only): ${change}. Backtest over the same window — alerts as-is: 95; as-proposed: 3. Empty counts mean the rule preview did not return, so there is NO backtest behind this proposal. Backtest detail: ${preview}. Declining ends the run and changes nothing. The detection engineer's own closing statement follows. I propose disabling the rule.`;

/**
 * The summary Detection Watch **v3 and earlier** rendered: the same facts flattened into prose,
 * with the rule named as `"<name>" (id <id>)`. Rows parked by an older watch version are still
 * pending after an upgrade, so this shape has to keep working.
 */
const legacyReasoning = (change: string, before = '95', after = '3'): string =>
  `Approval writes to a production detection rule. Rule: "${RULE_NAME}" (id ${RULE_ID}). Proposed change, restricted to enabled / investigation_fields / note: ${change}. Backtest over the same window — alerts as-is: ${before}; as-proposed: ${after}. Empty counts mean the rule preview did not return, so there is NO backtest behind this proposal. Declining ends the run and changes nothing. The detection engineer's own closing statement follows. I propose disabling the rule.`;

const LEGACY_REASONING = legacyReasoning('{"enabled":false}');

describe('parseTuningProposal', () => {
  describe('the labels are the contract with watch_post_incident.yaml', () => {
    it('pins the rule-name label', () => {
      expect(TUNING_RULE_NAME_LABEL).toBe('Rule name:');
    });

    it('pins the rule-id label', () => {
      expect(TUNING_RULE_ID_LABEL).toBe('Rule id:');
    });

    // Deliberately different from every earlier wording, because an absent anchor is how a row
    // parked by an older watch version is detected.
    it('pins the change label, which now names query', () => {
      expect(TUNING_CHANGE_LABEL).toBe(
        'Proposed change (enabled / investigation_fields / note / query only):'
      );
    });

    it('pins the label for the rule query as it stands', () => {
      expect(TUNING_CURRENT_QUERY_LABEL).toBe('Rule query as-is:');
    });

    it('pins the as-is count label', () => {
      expect(TUNING_BACKTEST_BEFORE_LABEL).toBe('Backtest alerts as-is:');
    });

    it('pins the as-proposed count label', () => {
      expect(TUNING_BACKTEST_AFTER_LABEL).toBe('Backtest alerts as-proposed:');
    });

    // Kept as readers, not as the format: a gate can sit parked for 30 days, and dropping them would
    // push a row written last week onto the fragile prose reader.
    it('keeps the v4 change label for a row parked before v8', () => {
      expect(TUNING_CHANGE_LABEL_V4).toBe(
        'Proposed change (enabled / investigation_fields / note only):'
      );
    });

    it('keeps the v4 backtest label for a row parked before v8', () => {
      expect(TUNING_PREVIEW_LABEL).toBe('Backtest detail:');
    });
  });

  describe('structured output present: the anchored labels', () => {
    it('reads the rule id', () => {
      expect(parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning() }).ruleId).toBe(
        RULE_ID
      );
    });

    it('reads the rule name, because a bare id is not reviewable', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning() }).ruleName
      ).toBe(RULE_NAME);
    });

    it('reads the proposed change', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning() }).change
      ).toEqual({ enabled: false });
    });

    it('reads a query rewrite, which is what makes a tuning a real detection change', () => {
      const change = `{"query":"${PROPOSED_QUERY}"}`;

      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning({ change }) }).change
      ).toEqual({ query: 'process.name : "powershell.exe" and not user.name : "svc-backup"' });
    });

    it('reads the rule query as it stands, so a rewrite can be shown as a diff', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning() }).currentQuery
      ).toBe('process.name : "powershell.exe"');
    });

    it('reports no current query when the watch could not read one', () => {
      expect(
        parseTuningProposal({
          message: MESSAGE,
          reasoning: anchoredReasoning({ currentQuery: '""' }),
        }).currentQuery
      ).toBeUndefined();
    });

    it('reads the backtest, which the row itself never carries', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning() }).preview
      ).toEqual({ after: { alertCount: 3 }, before: { alertCount: 95 } });
    });

    // The count is followed by the period that ends its sentence, and `95.` does not parse.
    it('reads a count that the sentence ends immediately after', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning({ before: '120' }) })
          .preview
      ).toEqual({ after: { alertCount: 3 }, before: { alertCount: 120 } });
    });

    it('reads a measured zero as zero, because zero alerts is a real measurement', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning({ after: '0' }) })
          .preview
      ).toEqual({ after: { alertCount: 0 }, before: { alertCount: 95 } });
    });

    it('reports that no prose had to be re-parsed', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning() }).recovery
      ).toBe('anchored');
    });

    it('tolerates the extra whitespace liquid folding leaves after a label', () => {
      const reasoning = 'Rule id:   "rule-1".';

      expect(parseTuningProposal({ message: '', reasoning }).ruleId).toBe('rule-1');
    });

    it('reads a note change whose text contains braces, without closing the object early', () => {
      const change = '{"note":"Check {host.name} against the patch window"}';

      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning({ change }) }).change
      ).toEqual({ note: 'Check {host.name} against the patch window' });
    });

    it('reads a nested investigation_fields change', () => {
      const change = '{"investigation_fields":{"field_names":["host.name","user.name"]}}';

      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning({ change }) }).change
      ).toEqual({ investigation_fields: { field_names: ['host.name', 'user.name'] } });
    });

    it('keeps a field outside the tunable set, so the dialog can show it as rejected', () => {
      const change = '{"alert_suppression":{"group_by":["host.name"]}}';

      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning({ change }) }).change
      ).toEqual({ alert_suppression: { group_by: ['host.name'] } });
    });

    it('reads an empty change object as an empty change, which the dialog treats as none', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning({ change: '{}' }) })
          .change
      ).toEqual({});
    });

    it('reports no change for a JSON array, which is not a rule patch', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning({ change: '[1]' }) })
          .change
      ).toBeUndefined();
    });
  });

  // The counts are read as JSON precisely so that `"inconclusive"` can never be reached as a number:
  // a surface showing `0` for a preview that never ran would be claiming the rewrite silences the
  // rule.
  describe('an unmeasured side is never read as a zero', () => {
    const inconclusive = '"inconclusive"';

    it('reads no count for an inconclusive side', () => {
      expect(
        parseTuningProposal({
          message: MESSAGE,
          reasoning: anchoredReasoning({ after: inconclusive }),
        }).preview
      ).toEqual({ before: { alertCount: 95 } });
    });

    it('still reads the side that was measured', () => {
      expect(
        parseTuningProposal({
          message: MESSAGE,
          reasoning: anchoredReasoning({ before: inconclusive }),
        }).preview
      ).toEqual({ after: { alertCount: 3 } });
    });

    it('says the preview never finished when a query rewrite went unmeasured', () => {
      const reasoning = anchoredReasoning({
        after: inconclusive,
        before: inconclusive,
        change: `{"query":"${PROPOSED_QUERY}"}`,
      });

      expect(parseTuningProposal({ message: MESSAGE, reasoning }).preview?.notMeasured).toMatch(
        /Inconclusive is not zero/
      );
    });

    it('says there was nothing to backtest when the proposal rewrites no query', () => {
      const reasoning = anchoredReasoning({ after: inconclusive, before: inconclusive });

      expect(parseTuningProposal({ message: MESSAGE, reasoning }).preview?.notMeasured).toMatch(
        /nothing to backtest/
      );
    });

    it('carries no count on either side when neither was measured', () => {
      const reasoning = anchoredReasoning({ after: inconclusive, before: inconclusive });

      expect(parseTuningProposal({ message: MESSAGE, reasoning }).preview).toEqual({
        notMeasured: expect.stringContaining('nothing to backtest'),
      });
    });
  });

  describe('prose the v3 reader mis-parsed', () => {
    // `RULE_PATTERN` matched the model's own inner quotes and captured " activity" as the rule name.
    it('reads a rule name containing quotes and parens exactly', () => {
      const ruleName = '"Suspicious \\"powershell\\" activity (encoded)"';

      expect(
        parseTuningProposal({ message: '', reasoning: anchoredReasoning({ ruleName }) }).ruleName
      ).toBe('Suspicious "powershell" activity (encoded)');
    });

    it('reads a rule name containing a newline', () => {
      const ruleName = '"Suspicious\\nPowerShell"';

      expect(
        parseTuningProposal({ message: '', reasoning: anchoredReasoning({ ruleName }) }).ruleName
      ).toBe('Suspicious\nPowerShell');
    });

    // v3 rendered `Rule: "" (id abc)`, and `RULE_PATTERN` requires at least one character between
    // the quotes — so a present id was lost along with the absent name.
    it('still reads the rule id when the model returned no rule name', () => {
      expect(
        parseTuningProposal({
          message: '',
          reasoning: anchoredReasoning({ ruleId: '"rule-1"', ruleName: '""' }),
        }).ruleId
      ).toBe('rule-1');
    });

    it('reports no rule name when the model returned none, rather than an empty string', () => {
      expect(
        parseTuningProposal({ message: '', reasoning: anchoredReasoning({ ruleName: '""' }) })
          .ruleName
      ).toBeUndefined();
    });

    // The v3 scan walked code POINTS while indexing code UNITS, so an astral character before the
    // closing brace made it cut the object short and lose the change entirely.
    it('reads a note change containing an astral character', () => {
      const change = '{"note":"Check 🎯 the {host} allow-list"}';

      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: anchoredReasoning({ change }) }).change
      ).toEqual({ note: 'Check 🎯 the {host} allow-list' });
    });

    it('ignores a brace in the closing statement, because the search starts at the label', () => {
      const reasoning = `${anchoredReasoning()} Consider {something else} later.`;

      expect(parseTuningProposal({ message: MESSAGE, reasoning }).change).toEqual({
        enabled: false,
      });
    });
  });

  // v4 through v7 anchored their facts too, so a row parked before `query` became tunable is read as
  // anchored rather than dropped onto the prose reader.
  describe('a row parked by a v4 through v7 watch', () => {
    it('reads the change behind the older label', () => {
      expect(parseTuningProposal({ message: MESSAGE, reasoning: v4Reasoning() }).change).toEqual({
        enabled: false,
      });
    });

    it('reads the backtest object the older watch rendered', () => {
      expect(parseTuningProposal({ message: MESSAGE, reasoning: v4Reasoning() }).preview).toEqual({
        after: { alertCount: 3 },
        before: { alertCount: 95 },
      });
    });

    it("reads the older watch's reason when no backtest was measured", () => {
      const preview = '{"before": {}, "after": {}, "notMeasured": "No rule preview was run."}';

      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: v4Reasoning({ preview }) }).preview
      ).toEqual({ after: {}, before: {}, notMeasured: 'No rule preview was run.' });
    });

    it('reports no backtest for a JSON array, which is not a preview', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: v4Reasoning({ preview: '[1]' }) })
          .preview
      ).toBeUndefined();
    });

    it('reads no current query, because the older watch never wrote one', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: v4Reasoning() }).currentQuery
      ).toBeUndefined();
    });

    it('is still reported as anchored, not as prose', () => {
      expect(parseTuningProposal({ message: MESSAGE, reasoning: v4Reasoning() }).recovery).toBe(
        'anchored'
      );
    });
  });

  describe('structured output missing: the legacy prose fallback', () => {
    it('still reads the rule id from a row parked by an older watch version', () => {
      expect(parseTuningProposal({ message: MESSAGE, reasoning: LEGACY_REASONING }).ruleId).toBe(
        RULE_ID
      );
    });

    it('still reads the rule name from a row parked by an older watch version', () => {
      expect(parseTuningProposal({ message: MESSAGE, reasoning: LEGACY_REASONING }).ruleName).toBe(
        RULE_NAME
      );
    });

    it('still reads the change from a row parked by an older watch version', () => {
      expect(parseTuningProposal({ message: MESSAGE, reasoning: LEGACY_REASONING }).change).toEqual(
        {
          enabled: false,
        }
      );
    });

    it('says the fields came from prose, so the surface can say so too', () => {
      expect(parseTuningProposal({ message: MESSAGE, reasoning: LEGACY_REASONING }).recovery).toBe(
        'legacy'
      );
    });

    // v3 never rendered a machine-readable backtest, and the two counts in its prose are not a
    // preview object — inferring one from them would invent the windows.
    it('recovers no backtest from a legacy row', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: LEGACY_REASONING }).preview
      ).toBeUndefined();
    });

    it('falls back to the gate message when the legacy reasoning names no rule', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: 'nothing structured here' })
      ).toEqual({
        recovery: 'legacy',
        ruleId: RULE_ID,
        ruleName: RULE_NAME,
      });
    });

    it('reports no rule id when liquid rendered an empty one, rather than an empty string', () => {
      const reasoning =
        'Rule: "Endpoint Security [Insights]" (id ). Proposed change: {"enabled":false}.';

      expect(parseTuningProposal({ message: '', reasoning }).ruleId).toBeUndefined();
    });

    it('still reads the legacy rule name when the id is missing', () => {
      const reasoning = 'Rule: "Endpoint Security [Insights]" (id ).';

      expect(parseTuningProposal({ message: '', reasoning }).ruleName).toBe(RULE_NAME);
    });

    it('reports no change when the legacy JSON did not parse', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: legacyReasoning('{"enabled":') }).change
      ).toBeUndefined();
    });

    it('reports no change when the legacy summary has no object in it at all', () => {
      expect(
        parseTuningProposal({ message: MESSAGE, reasoning: 'Proposed change: disable the rule.' })
          .change
      ).toBeUndefined();
    });

    // A label the model happened to write in its own prose is not an anchored value, so the reader
    // must not treat the row as anchored and abandon the prose it can still read.
    it('reads a legacy row whose closing statement mentions a label in passing', () => {
      const reasoning = `${LEGACY_REASONING} Rule name: see above.`;

      expect(parseTuningProposal({ message: MESSAGE, reasoning }).ruleName).toBe(RULE_NAME);
    });
  });

  describe('nothing to recover', () => {
    it('returns no fields for an empty row rather than throwing', () => {
      expect(parseTuningProposal({ message: '', reasoning: '' })).toEqual({ recovery: 'none' });
    });

    // The degraded card: no draft was returned, so liquid rendered every anchored value empty and
    // both counts as `"inconclusive"`. Recovering a rule id here would offer an apply for a rule the
    // model never named.
    it('recovers nothing from a degraded card, rather than a bogus rule', () => {
      const reasoning = `NO TUNING WAS DRAFTED: the detection-engineer agent did not return a rule to tune. ${anchoredReasoning(
        {
          after: '"inconclusive"',
          before: '"inconclusive"',
          change: 'null',
          currentQuery: '""',
          ruleId: '""',
          ruleName: '""',
        }
      )}`;

      expect(parseTuningProposal({ message: '', reasoning })).toEqual({ recovery: 'none' });
    });

    // Both counts are present and both are inconclusive, but the absence to explain is the draft's,
    // and the row already says so in its first sentence.
    it('does not explain a missing backtest for a proposal that does not exist', () => {
      const reasoning = anchoredReasoning({
        after: '"inconclusive"',
        before: '"inconclusive"',
        change: '',
        currentQuery: '',
        ruleId: '""',
        ruleName: '""',
      });

      expect(parseTuningProposal({ message: '', reasoning }).preview).toBeUndefined();
    });

    it('says nothing was recovered, so the surface can say the fields are absent', () => {
      expect(parseTuningProposal({ message: '', reasoning: 'a plain sentence' }).recovery).toBe(
        'none'
      );
    });
  });
});
