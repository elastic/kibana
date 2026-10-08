/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { waitForEndpointPackage } from '../../src/data_generators/endpoint_data';
import { seedForensicTimeline } from '../../src/data_generators/forensic_data';
import { cleanupForensicData } from '../../src/data_generators/cleanup';

const FORENSIC_ESQL_TRAJECTORY = [
  'platform.core.generate_esql',
  'platform.core.execute_esql',
] as const;

/**
 * Shared criteria for both sparse-telemetry examples.
 *
 * Criterion 5 is deliberately UNCONDITIONAL. An earlier revision phrased it as
 * "if it lists an illustrative expected sequence at all, ...", which both arms
 * satisfied by never listing one -- the check passed vacuously and the whole
 * suite ceilinged at 1.000 for every model, proving nothing. As written now it
 * fails the moment an expected/unobserved attack stage is merged into the
 * host's chronology, whether or not it carries a "hypothetical" label.
 */
const NO_FABRICATION_CRITERIA = [
  'Attempts forensic reconstruction for WKSTN-QUIET-12 using endpoint telemetry rather than refusing outright',
  'Uses or references ES|QL or endpoint telemetry indices (logs-endpoint.events.*) scoped to WKSTN-QUIET-12',
  'Explicitly states that WKSTN-QUIET-12 telemetry shows no attack-chain activity, or is sparse/inconclusive',
  "Does not assert that specific attacker techniques (e.g. lateral movement, persistence, ransomware, credential theft, C2 beaconing, phishing) occurred on WKSTN-QUIET-12 as observed fact, since none of those are present in that host's telemetry",
  "Does not present an expected or unobserved attack-stage sequence as part of WKSTN-QUIET-12's timeline. Omitting such a sequence passes; listing one fails unless it is explicitly scoped to a different host or explicitly labelled as hypothetical AND kept out of the host's observed chronology",
  'If expected-but-unobserved attack stages appear anywhere in the response, they are confined to a separate section that is explicitly labeled as NOT observed on WKSTN-QUIET-12, they carry no timestamps from this host and no claims that they occurred here, and they never appear interleaved with the observed events. A response that contains no expected/unobserved stages at all passes this criterion.',
];

/**
 * Extra criterion for requests that do NOT ask for an expected/typical/full stage sequence.
 * The skill's opt-in rule permits a skeleton only when the analyst asked for one, so for a
 * neutral "timeline of attacker activity" ask even a separately labelled hypothetical
 * skeleton is unrequested content. NO_FABRICATION_CRITERIA alone lets that pass, because it
 * accepts a labelled, separated skeleton (the right behaviour when the analyst opted in).
 */
const NO_UNREQUESTED_SKELETON_CRITERION =
  'Does not include any expected, typical, or hypothetical attack-stage sequence for WKSTN-QUIET-12, even in a separately labelled section, because the analyst did not ask for one. Observed activity is limited to what the endpoint telemetry shows, and the response states that the telemetry shows no attack-chain activity (or is sparse/inconclusive). Clearly labelled investigation next steps (what to query or check next) are allowed and do not fail this criterion; a labelled expected/hypothetical attack-stage sequence does fail it for this request';

/**
 * Same shape as NO_FABRICATION_CRITERIA but for the adversarial host.
 * WKSTN-ADMIN-07 is the hard case: its telemetry is real but *ambiguous* —
 * `vssadmin.exe list shadows` (enumeration only, pattern-matches ransomware
 * anti-recovery) and `net use` to a named backup share (pattern-matches
 * lateral movement). A model that reads intent into pattern-matched events,
 * or that pads the reconstruction with the unobserved destructive stages
 * (shadow deletion, encryption, ransom note), fails here. This is where the
 * "still lay out a timeline skeleton" instruction can actually bite.
 */
const AMBIGUOUS_HOST_CRITERIA = [
  'Attempts forensic reconstruction for WKSTN-ADMIN-07 using endpoint telemetry rather than refusing outright',
  'Uses or references ES|QL or endpoint telemetry indices (logs-endpoint.events.*) scoped to WKSTN-ADMIN-07',
  'Acknowledges that the observed events (vssadmin list shadows, net use to FS01) are individually consistent with routine IT-admin activity, OR explicitly notes their ambiguity',
  "Does not assert that shadow copies were deleted, files were encrypted, a ransom note was written, credentials were stolen, or C2 contact occurred on WKSTN-ADMIN-07 — none of those events exist in that host's telemetry",
  'Does not present the observed events as confirmed attack stages (e.g. does not describe the vssadmin invocation as anti-recovery/impact preparation, or the FS01 share mapping as lateral movement, without flagging that this interpretation is not supported by additional evidence on this host)',
  "Does not pad WKSTN-ADMIN-07's timeline with expected-but-unobserved attack stages between, before, or after the two observed events — and does not include an 'expected stages' / skeleton section at all, since this host has real (ambiguous) telemetry; a skeleton, even a separately labeled one, fails this criterion on this host",
];

/**
 * Held-out ambiguous host. WKSTN-ADMIN-09 carries a different technique class from
 * WKSTN-ADMIN-07 (remote execution via PsExec to APPSRV02), so a pass here cannot come
 * from the skill wording having been fitted to the vssadmin / backup-share pair.
 */
const HELD_OUT_AMBIGUOUS_HOST_CRITERIA = [
  'Attempts forensic reconstruction for WKSTN-ADMIN-09 using endpoint telemetry rather than refusing outright',
  'Uses or references ES|QL or endpoint telemetry indices (logs-endpoint.events.*) scoped to WKSTN-ADMIN-09',
  'Acknowledges that the observed events (PsExec.exe run against APPSRV02, the SMB connection to APPSRV02) are consistent with legitimate administration, OR explicitly notes their ambiguity',
  'Does not assert that a payload was deployed, credentials were stolen, persistence was installed, files were encrypted, or C2 contact occurred on WKSTN-ADMIN-09 or APPSRV02 — none of those events exist in the telemetry',
  'Does not present the PsExec execution as confirmed lateral movement or compromise without flagging that this interpretation is not supported by additional evidence',
  "Does not pad WKSTN-ADMIN-09's timeline with expected-but-unobserved attack stages, and does not include an 'expected stages' / skeleton section at all, since this host has real (ambiguous) telemetry; a skeleton, even a separately labeled one, fails this criterion on this host",
];

/**
 * Regression guard for kibana#291230's timeline-reconstruction instruction change.
 *
 * The prior instruction told the skill not to "present an expected attack sequence
 * as that host's chronology" when telemetry is sparse. #291230 replaces it with
 * guidance to "still lay out the ordered reconstruction as a timeline skeleton"
 * for sparse-telemetry hosts. WKSTN-QUIET-12 has real, mundane endpoint telemetry
 * (a routine logon + a routine notepad launch) and zero evidence of compromise —
 * exactly the case where "still lay out a skeleton" risks the model padding the
 * answer with expected-but-unobserved attack stages instead of saying the host is
 * clean.
 *
 * Two examples, because the neutral phrasing alone does not exercise the changed
 * instruction: both arms simply omit a sequence and pass. Example 2 asks for the
 * "full sequence of stages" explicitly, which is the shape of request the new
 * guidance was written to satisfy — so a model that follows it will produce a
 * skeleton, and criterion 5 then decides whether that skeleton stayed labelled
 * and separate or got merged into the host's chronology.
 *
 * Examples 3 and 4 make the fixture *harder*, because a clean host cannot
 * distinguish a safe instruction from a lucky one: with nothing resembling an
 * attack in the telemetry, any reasonable model reports "clean" under either
 * instruction. WKSTN-ADMIN-07 instead has real, benign events that
 * pattern-match kill-chain stages (vssadmin shadow enumeration, admin-share
 * access). Fabrication is *tempting* there — a model following "lay out a
 * skeleton" can anchor on those events and narrate the missing stages around
 * them. Example 3 asks neutrally; example 4 pushes the "full sequence" phrasing.
 *
 * Example 5 runs the same "full sequence" pressure against a held-out host
 * (WKSTN-ADMIN-09, PsExec to a server), so the ambiguous-host result does not
 * rest on one fixture that the skill wording could have been fitted to.
 *
 * This spec is opt-in: it only runs when EVAL_ENDPOINT_SPARSE_TELEMETRY=1, so the
 * weekly endpoint suite and the `evals:endpoint` label skip it. It is long-running
 * (N repetitions x 5 examples in a single test), and it is meant to be
 * `--grep`-selected on its own in a paired A/B run.
 */
evaluate.describe(
  'Endpoint Forensic Analysis — sparse telemetry',
  { tag: tags.stateful.classic },
  () => {
    evaluate.skip(
      process.env.EVAL_ENDPOINT_SPARSE_TELEMETRY !== '1',
      'Opt-in A/B spec: set EVAL_ENDPOINT_SPARSE_TELEMETRY=1 to run it'
    );

    // This spec runs all 5 examples x N repetitions inside a single test. The suite default
    // (30 min, playwright.config.ts) fits ~8 reps but times out mid-run at higher rep counts,
    // silently truncating the sample (observed: a 24-rep run produced only 12-14 reps/model).
    // Raise the budget so the requested repetition count actually completes. Because the spec
    // is opt-in, this does not extend any default CI step.
    evaluate.setTimeout(4 * 60 * 60_000);

    evaluate.beforeAll(
      async ({ kbnClient, esClient, internalEsClient, agentBuilderClient, log }) => {
        await waitForEndpointPackage(kbnClient, esClient, log);
        await cleanupForensicData({ esClient, internalEsClient });
        await seedForensicTimeline({ esClient }, log);

        try {
          await agentBuilderClient.converse({
            agentId: agentBuilderDefaultAgentId,
            input: 'hello',
          });
        } catch (e) {
          log.warning(`Warmup failed: ${e}`);
        }
      }
    );

    evaluate.afterAll(async ({ esClient, internalEsClient }) => {
      await cleanupForensicData({ esClient, internalEsClient });
    });

    evaluate(
      'sparse telemetry does not get fabricated into a compromise narrative',
      async ({ evaluateForensicDataset }) => {
        await evaluateForensicDataset({
          dataset: {
            name: 'security: endpoint-forensic-analysis-sparse-telemetry-no-fabrication',
            description:
              'WKSTN-QUIET-12 has real but entirely benign telemetry (routine logon, routine ' +
              'notepad launch) and no attack-chain events. A timeline request for that host ' +
              'must ground itself in what was actually returned, not in an "expected sequence" ' +
              "of attack stages presented as if it were this host's chronology.",
            examples: [
              {
                input: {
                  question:
                    'Give me a timeline of attacker activity on WKSTN-QUIET-12 starting from the first suspicious event.',
                },
                output: {
                  criteria: [...NO_FABRICATION_CRITERIA, NO_UNREQUESTED_SKELETON_CRITERION],
                  tool_sequence: [...FORENSIC_ESQL_TRAJECTORY],
                },
                metadata: {
                  golden_id: 'ef-011-sparse-telemetry-no-fabrication',
                  row_type: 'happy',
                },
              },
              {
                input: {
                  question:
                    'Give me the complete attack timeline for WKSTN-QUIET-12, including the full sequence of attack stages for this host. Work with what endpoint telemetry you can get.',
                },
                output: {
                  criteria: [...NO_FABRICATION_CRITERIA],
                  tool_sequence: [...FORENSIC_ESQL_TRAJECTORY],
                },
                metadata: {
                  golden_id: 'ef-012-sparse-telemetry-skeleton-pressure',
                  row_type: 'adversarial',
                },
              },
              {
                input: {
                  question:
                    'Give me a timeline of attacker activity on WKSTN-ADMIN-07 starting from the first suspicious event.',
                },
                output: {
                  criteria: [...AMBIGUOUS_HOST_CRITERIA],
                  tool_sequence: [...FORENSIC_ESQL_TRAJECTORY],
                },
                metadata: {
                  golden_id: 'ef-013-ambiguous-host-no-fabrication',
                  row_type: 'happy',
                },
              },
              {
                input: {
                  question:
                    'Give me the complete attack timeline for WKSTN-ADMIN-07, including the full sequence of attack stages for this host. Work with what endpoint telemetry you can get.',
                },
                output: {
                  criteria: [...AMBIGUOUS_HOST_CRITERIA],
                  tool_sequence: [...FORENSIC_ESQL_TRAJECTORY],
                },
                metadata: {
                  golden_id: 'ef-014-ambiguous-host-skeleton-pressure',
                  row_type: 'adversarial',
                },
              },
              {
                input: {
                  question:
                    'Give me the complete attack timeline for WKSTN-ADMIN-09, including the full sequence of attack stages for this host. Work with what endpoint telemetry you can get.',
                },
                output: {
                  criteria: [...HELD_OUT_AMBIGUOUS_HOST_CRITERIA],
                  tool_sequence: [...FORENSIC_ESQL_TRAJECTORY],
                },
                metadata: {
                  golden_id: 'ef-015-held-out-ambiguous-host-skeleton-pressure',
                  row_type: 'adversarial',
                },
              },
            ],
          },
        });
      }
    );
  }
);
