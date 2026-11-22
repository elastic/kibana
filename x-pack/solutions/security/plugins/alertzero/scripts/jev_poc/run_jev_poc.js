/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Jev proof of concept, offline. Not part of the product.
 *
 * Asks the Jev decision model, on an EIS QA project, whether each labeled alert is benign activity
 * like an approved false-positive pattern. Then it sweeps a threshold and reports, per threshold,
 * how many false positives Jev would skip and how many true positives it would wrongly skip.
 *
 *   QA_ES_URL=https://<project>.es.<region>.qa.cld.elstc.co QA_ES_API_KEY=<key> \
 *     node x-pack/solutions/security/plugins/alertzero/scripts/jev_poc/run_jev_poc.js [options]
 *
 *   --variant   Comma-separated variants, or `all` (default: strict). See VARIANTS below.
 *   --dataset   Path to a dataset JSON (default: ./dataset.json next to this script)
 *   --endpoint  Inference endpoint id (default: .typesafe-jev-1.13_decision)
 *   --repeat    Calls per alert, to see how stable the probability is (default: 1)
 *
 * Needs Node 18 or later (global fetch). It has no Kibana dependency and sends no data anywhere
 * except to QA_ES_URL, so use synthetic or internal alerts only.
 *
 * Dataset formats:
 *   - dataset.json: one rule, `approved_pattern`, and `alerts`.
 *   - holdout.json: `groups`, each with its own rule, `approved_pattern`, `approved_fields` and
 *     `alerts`. `generic` renders `approved_fields` as the pattern, the way a stored decision
 *     would. The other variants use the `approved_pattern` text.
 *
 * Alert flags, used by the summaries:
 *   exact_key_miss: a false positive that an exact pattern key would not match (what Jev adds).
 *   exact_key_hit:  a true positive that an exact pattern key would match (layer 1 would close it).
 *
 * Variants change one thing about the question. Compare them on the same dataset, and confirm a
 * winner on a dataset you did not tune on. `loose` names the distinctions that dataset.json's true
 * positives differ by, so it only runs on that dataset.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const ES_URL = (process.env.QA_ES_URL || '').replace(/\/$/, '');
const API_KEY = process.env.QA_ES_API_KEY || '';
const ENDPOINT = opt('endpoint', '.typesafe-jev-1.13_decision');
const REPEAT = Number(opt('repeat', '1'));
const DATASET = opt('dataset', path.join(__dirname, 'dataset.json'));
const QUESTION = 'is_benign_like_approved';

if (!ES_URL || !API_KEY) {
  console.error('Set QA_ES_URL and QA_ES_API_KEY.');
  process.exit(1);
}
// The API key goes in a header, so it must never travel over plain http to another host.
const isSafeRemoteUrl = (url) => {
  if (url.startsWith('https://')) return true;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');
  } catch {
    return false;
  }
};
if (!isSafeRemoteUrl(ES_URL)) {
  console.error('QA_ES_URL must be an https URL, or http on localhost.');
  process.exit(1);
}

const dataset = JSON.parse(fs.readFileSync(DATASET, 'utf8'));
const isGrouped = Array.isArray(dataset.groups);
const groups = isGrouped
  ? dataset.groups
  : [
      {
        name: 'main',
        rule: dataset.rule,
        approved_pattern: dataset.approved_pattern,
        alerts: dataset.alerts,
      },
    ];

const alertText = (alert, group) =>
  [`Rule: ${group.rule}`, ...Object.entries(alert.doc).map(([k, v]) => `${k}: ${v}`)].join('\n');

// What a stored decision would give a real call: its identifying fields. Falls back to the text.
const patternFields = (group) =>
  group.approved_fields
    ? Object.entries(group.approved_fields)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
    : group.approved_pattern;

const predicate = (instructions) => ({ type: 'predicate', instructions });
const readPredicate = (answer) => answer?.probability;

const choice = (instructions) => ({
  type: 'choice',
  instructions,
  choices: {
    benign: 'Routine activity of the approved pattern',
    suspicious: 'Anything else',
  },
});
// The live answer lists the options as [{ value, probability }], not as a map.
const readChoice = (answer) => {
  const { probabilities } = answer ?? {};
  if (Array.isArray(probabilities)) {
    return probabilities.find((option) => option.value === 'benign')?.probability;
  }
  return probabilities?.benign;
};

/**
 * Each variant returns the request input and question for an alert, and reads the probability that
 * the alert is benign out of the answer.
 */
const VARIANTS = {
  // The first run: the pattern is in the instructions, and every difference counts.
  strict: {
    build: (alert, group) => ({
      input: alertText(alert, group),
      question: predicate(
        'Answer true only if this alert is routine activity that matches the approved ' +
          'false-positive pattern below in every detail that matters (binary, signer, parent, ' +
          'destination). If any of them differs in a way that could be malicious, answer false.\n' +
          `Approved pattern: ${group.approved_pattern}`
      ),
    }),
    read: readPredicate,
  },
  // Tolerates where the vendor binary is installed. Names the distinctions dataset.json uses.
  loose: {
    datasetOnly: true,
    build: (alert, group) => ({
      input: alertText(alert, group),
      question: predicate(
        'Answer true if this alert is routine activity of the vendor updater described below. ' +
          'A different install folder, version folder or drive is fine when the binary name and ' +
          'signer match, and so is a parent process that is another component of the same ' +
          "vendor, and a destination under the vendor's domain or its subdomains. Answer false " +
          'if the signer differs or is missing, the binary runs from a user-writable folder ' +
          '(Temp, Users, Public), the destination is not the vendor, or the process starts ' +
          'another program such as a shell.\n' +
          `Vendor updater: ${group.approved_pattern}`
      ),
    }),
    read: readPredicate,
  },
  // Same strict wording, but the approved pattern is part of the input text.
  pattern_in_input: {
    build: (alert, group) => ({
      input: `${alertText(alert, group)}\n\nApproved false-positive pattern: ${
        group.approved_pattern
      }`,
      question: predicate('Is this alert routine activity of the approved false-positive pattern?'),
    }),
    read: readPredicate,
  },
  // A two-option choice instead of a predicate. Reads the probability of the `benign` option.
  choice: {
    build: (alert, group) => ({
      input: alertText(alert, group),
      question: choice(
        'Pick benign only if this alert is routine activity that matches the approved ' +
          'false-positive pattern. Pick suspicious if it differs in a way that could be ' +
          `malicious.\nApproved pattern: ${group.approved_pattern}`
      ),
    }),
    read: readChoice,
  },
  // One fixed instruction for every pattern, the way production would have to work. The pattern is
  // the stored decision's identifying fields. It names kinds of change, never a dataset's cases.
  generic: {
    build: (alert, group) => ({
      input: alertText(alert, group),
      question: predicate(
        'Answer true if this alert is the same routine activity as the approved pattern below. ' +
          'The fields listed in the pattern identify the activity, and the alert must match them ' +
          'in meaning. Values that normally vary between runs of the same activity are fine: the ' +
          'host, the user session, a version number in a path, the install location of the same ' +
          'signed program, and an address inside the same network or service. Answer false if ' +
          'the alert differs in who did it, which signed program ran, what started it, or what ' +
          'it did, or if anything else in the alert looks unusual or malicious, even when the ' +
          `identifying fields match.\nApproved pattern:\n${patternFields(group)}`
      ),
    }),
    read: readPredicate,
  },
};

const requested = opt('variant', 'strict');
const variantNames =
  requested === 'all'
    ? Object.keys(VARIANTS).filter((name) => !(isGrouped && VARIANTS[name].datasetOnly))
    : requested.split(',');
const unknown = variantNames.filter((name) => !VARIANTS[name]);
if (unknown.length) {
  console.error(
    `Unknown variant: ${unknown.join(', ')}. Known: ${Object.keys(VARIANTS).join(', ')}`
  );
  process.exit(1);
}
const wrongDataset = variantNames.filter((name) => isGrouped && VARIANTS[name].datasetOnly);
if (wrongDataset.length) {
  console.error(`Variant ${wrongDataset.join(', ')} only runs on dataset.json.`);
  process.exit(1);
}

const decide = async ({ input, question }) => {
  const started = Date.now();
  const res = await fetch(`${ES_URL}/_inference/decision/${encodeURIComponent(ENDPOINT)}`, {
    method: 'POST',
    headers: { Authorization: `ApiKey ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, task_settings: { questions: { [QUESTION]: question } } }),
  });
  const ms = Date.now() - started;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return { answer: body?.decision?.answers?.[QUESTION], body, ms };
};

const THRESHOLDS = [0.5, 0.7, 0.8, 0.9, 0.95, 0.98, 0.99];

// Alerts that got no score in a variant, because every call failed. A variant must not look safer because of them.
const unscored = {};

const runVariant = async (name) => {
  const variant = VARIANTS[name];
  const rows = [];
  unscored[name] = { fp: 0, tp: 0 };
  let printedRaw = false;
  for (const group of groups) {
    for (const alert of group.alerts) {
      const probs = [];
      const times = [];
      for (let i = 0; i < REPEAT; i++) {
        try {
          const { answer, body, ms } = await decide(variant.build(alert, group));
          if (!printedRaw) {
            console.log(`[${name}] first raw response:`, JSON.stringify(body));
            printedRaw = true;
          }
          const p = variant.read(answer);
          if (typeof p !== 'number') throw new Error(`no probability in ${JSON.stringify(body)}`);
          probs.push(p);
          times.push(ms);
        } catch (e) {
          console.error(`[${name}] ${alert.id}: ${e.message}`);
        }
      }
      if (probs.length) {
        rows.push({
          id: alert.id,
          label: alert.label,
          exactKeyMiss: alert.exact_key_miss === true,
          // An alert the exact key would match: every false positive that is not a miss, and the
          // true positives flagged as hits.
          exactKeyHit:
            alert.label === 'fp' ? alert.exact_key_miss !== true : alert.exact_key_hit === true,
          note: alert.note,
          p: probs.reduce((a, b) => a + b, 0) / probs.length,
          spread: Math.max(...probs) - Math.min(...probs),
          ms: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        });
      } else {
        unscored[name][alert.label === 'tp' ? 'tp' : 'fp']++;
      }
    }
  }
  return rows;
};

const printRows = (name, rows) => {
  console.log(`\n=== ${name} ===`);
  console.log('id          label  p(benign)  spread  ms    note');
  for (const r of [...rows].sort((a, b) => b.p - a.p)) {
    console.log(
      `${r.id.padEnd(11)} ${r.label.padEnd(6)} ${r.p.toFixed(3).padEnd(10)} ${r.spread
        .toFixed(3)
        .padEnd(7)} ${String(r.ms).padEnd(5)} ${r.note}`
    );
  }
};

// `extra` counts only the false positives an exact key would miss: what Jev adds to layer 1.
// `vetoTp` counts true positives that an exact key would close and Jev would stop (p below t).
// `lostFp` counts false positives that an exact key would close and Jev would stop.
const sweep = (rows) => {
  const fps = rows.filter((r) => r.label === 'fp');
  const tps = rows.filter((r) => r.label === 'tp');
  const extras = fps.filter((r) => r.exactKeyMiss);
  const hitTps = tps.filter((r) => r.exactKeyHit);
  const hitFps = fps.filter((r) => r.exactKeyHit);
  return THRESHOLDS.map((t) => ({
    t,
    extra: extras.filter((r) => r.p >= t).length,
    missed: tps.filter((r) => r.p >= t).length,
    vetoTp: hitTps.filter((r) => r.p < t).length,
    lostFp: hitFps.filter((r) => r.p < t).length,
    totals: {
      fps: fps.length,
      extras: extras.length,
      tps: tps.length,
      hitTps: hitTps.length,
      hitFps: hitFps.length,
    },
  }));
};

(async () => {
  const results = {};
  for (const name of variantNames) {
    const rows = await runVariant(name);
    results[name] = rows;
    printRows(name, rows);
    const lat = rows.map((r) => r.ms).sort((a, b) => a - b);
    if (lat.length) {
      console.log(
        `latency ms: median ${lat[Math.floor(lat.length / 2)]}, max ${lat[lat.length - 1]}`
      );
    }
  }

  const first = sweep(results[variantNames[0]] || [])[0];
  if (!first) return;
  const { totals } = first;
  const head = `variant`.padEnd(18) + THRESHOLDS.map((t) => String(t).padEnd(10)).join('');

  console.log(
    `\nAdded value: ${totals.extras} false positives that an exact key would miss, ` +
      `${totals.tps} true positives`
  );
  console.log(
    'cell = extra skipped / extras, then wrong skips / scored true positives as <n>/<m>w. ' +
      'Look for the most extra at 0w. A variant with unscored alerts is not comparable.'
  );
  console.log(head);
  for (const name of variantNames) {
    const cells = sweep(results[name]).map((s) =>
      `${s.extra}/${s.totals.extras}/${s.missed}/${s.totals.tps}w`.padEnd(10)
    );
    const { fp, tp } = unscored[name];
    const note = fp + tp > 0 ? `  UNSCORED: ${tp} true positives, ${fp} false positives` : '';
    console.log(name.padEnd(18) + cells.join('') + note);
  }

  if (totals.hitTps > 0) {
    console.log(
      `\nVeto value: ${totals.hitTps} true positives and ${totals.hitFps} false positives that an ` +
        'exact key would close.'
    );
    console.log(
      'cell = true positives Jev would stop / total, then false positives it would stop (cost).'
    );
    console.log(head);
    for (const name of variantNames) {
      const cells = sweep(results[name]).map((s) =>
        `${s.vetoTp}/${s.totals.hitTps},${s.lostFp}/${s.totals.hitFps}`.padEnd(10)
      );
      console.log(name.padEnd(18) + cells.join(''));
    }
  }
})();
