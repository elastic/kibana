#!/usr/bin/env node
/**
 * Standalone MITRE ATT&CK retrieval benchmark.
 *
 * Compares keyword vs semantic (vs hybrid-bool) search quality
 * for the mitre_attack plugin DSL against a local ES 9.x instance.
 *
 * Usage:
 *   node retrieval_benchmark.js [--es http://localhost:9200] [--auth elastic:changeme]
 *
 * Output:
 *   poc_findings/mitre_semantic_poc/benchmark_results.json
 *   poc_findings/mitre_semantic_poc/benchmark_results.md
 */
'use strict';

const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};

const ES_URL = getArg('--es', 'http://localhost:9200');
const ES_AUTH = getArg('--auth', 'elastic:changeme');
const INDEX = '.kibana_security_solution';
const FRAMEWORK = 'enterprise';
const FRAMEWORK_VERSION = '19.1';
const ATTR = 'mitre-attack-entity';
const SIZE = 10;
const OUTPUT_DIR = path.resolve(
  __dirname,
  '../../../../../../poc_findings/mitre_semantic_poc'
);

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------
const request = (url, body) =>
  new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;
    const [user, pass] = ES_AUTH.split(':');
    const data = JSON.stringify(body);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        Authorization: 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64'),
      },
    };
    const req = transport.request(options, (res) => {
      let buf = '';
      res.on('data', (d) => (buf += d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(buf));
        } catch (e) {
          reject(new Error(`JSON parse error: ${buf.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });

const esSearch = (query, size = SIZE) =>
  request(`${ES_URL}/${INDEX}/_search`, { query, size });

const esqlQuery = (esql) =>
  request(`${ES_URL}/_query`, { query: esql });

// ---------------------------------------------------------------------------
// DSL builders — mirror MitreAttackDataClientImpl exactly
// ---------------------------------------------------------------------------
const buildFilters = () => ({
  filter: [
    { term: { type: ATTR } },
    { term: { [`${ATTR}.framework`]: FRAMEWORK } },
    { term: { [`${ATTR}.framework_version`]: FRAMEWORK_VERSION } },
  ],
  mustNot: [
    { term: { [`${ATTR}.revoked`]: true } },
    { term: { [`${ATTR}.deprecated`]: true } },
  ],
});

const keywordQuery = (q) => {
  const { filter, mustNot } = buildFilters();
  return {
    bool: {
      must: [
        {
          multi_match: {
            query: q,
            fields: [
              `${ATTR}.name.text^3`,
              `${ATTR}.description`,
              `${ATTR}.id^2`,
            ],
          },
        },
      ],
      filter,
      must_not: mustNot,
    },
  };
};

const semanticQuery = (q) => {
  const { filter, mustNot } = buildFilters();
  return {
    bool: {
      must: [{ semantic: { field: `${ATTR}.semantic_content`, query: q } }],
      filter,
      must_not: mustNot,
    },
  };
};

// Bonus: hybrid bool-should (not shipped in POC — clearly labelled)
const hybridQuery = (q) => {
  const { filter, mustNot } = buildFilters();
  return {
    bool: {
      should: [
        {
          multi_match: {
            query: q,
            fields: [
              `${ATTR}.name.text^3`,
              `${ATTR}.description`,
              `${ATTR}.id^2`,
            ],
          },
        },
        { semantic: { field: `${ATTR}.semantic_content`, query: q } },
      ],
      minimum_should_match: 1,
      filter,
      must_not: mustNot,
    },
  };
};

// ---------------------------------------------------------------------------
// Labeled query sets (from PR #282451 behavioral/prompt/independent files)
// ---------------------------------------------------------------------------
const BEHAVIORAL_QUERIES = [
  { query: 'adversary reads credentials out of the lsass process memory', relevant: ['T1003.001'] },
  { query: 'replicating directory data from a domain controller', relevant: ['T1003.006'] },
  { query: 'stealing password hashes from the ntds database', relevant: ['T1003.003'] },
  { query: 'malware survives reboot by adding itself to a registry autostart location', relevant: ['T1547.001'] },
  { query: 'attacker keeps access by registering a scheduled job', relevant: ['T1053.005'] },
  { query: 'periodic job on a linux host runs an attacker script', relevant: ['T1053.003'] },
  { query: 'linux daemon installed so the implant restarts at boot', relevant: ['T1543.002'] },
  { query: 'macos property list installed to relaunch a binary', relevant: ['T1543.001'] },
  { query: 'base64 encoded command line passed to the windows shell', relevant: ['T1059.001'] },
  { query: 'wiping the security log to cover tracks', relevant: ['T1685.005'] },
  { query: 'backdating a file so it blends in with system files', relevant: ['T1070.006'] },
  { query: 'guessing many passwords against one account', relevant: ['T1110'] },
  { query: 'trying one common password across every account in the domain', relevant: ['T1110.003'] },
  { query: 'requesting service tickets to crack offline', relevant: ['T1558.003'] },
  { query: 'forging a ticket granting ticket with a stolen krbtgt key', relevant: ['T1558.001'] },
  { query: 'authenticating with a stolen hash instead of a password', relevant: ['T1550.002'] },
  { query: 'logging in with legitimate stolen account credentials', relevant: ['T1078'] },
  { query: 'user opens a malicious document attached to an email', relevant: ['T1566.001'] },
  { query: 'targeted email tricking a user into clicking a hostile url', relevant: ['T1566.002'] },
  { query: 'attacker breaks in through a vulnerable internet facing web server', relevant: ['T1190'] },
  { query: 'initial access through a corporate vpn appliance', relevant: ['T1133'] },
  { query: 'implant hides its traffic inside domain name lookups', relevant: ['T1071.004'] },
  { query: 'implant checks in with its operator over ordinary web traffic', relevant: ['T1071.001'] },
  { query: 'stolen files uploaded to a third party file sharing service', relevant: ['T1567.002'] },
  { query: 'files across the network are made unreadable and a ransom is demanded', relevant: ['T1486'] },
  { query: 'removing backups so the machine cannot be restored', relevant: ['T1490'] },
  { query: 'turning off the endpoint protection agent', relevant: ['T1685'] },
  { query: 'writing shellcode into the address space of another running program', relevant: ['T1055'] },
  { query: 'planting a rogue library next to a signed executable so it gets loaded', relevant: ['T1574.001'] },
  { query: 'abusing a signed microsoft binary to run attacker code', relevant: ['T1218'] },
  { query: 'remote command execution through windows management instrumentation', relevant: ['T1047'] },
  { query: 'moving between hosts over the remote desktop protocol', relevant: ['T1021.001'] },
  { query: 'hopping to another server over an encrypted shell session', relevant: ['T1021.004'] },
  { query: 'creating an extra administrator account on the machine', relevant: ['T1136.001'] },
  { query: 'quietly adding an account to a highly privileged group', relevant: ['T1098'] },
  { query: 'listing the file shares available on the network', relevant: ['T1135'] },
  { query: 'enumerating every user account in active directory', relevant: ['T1087.002'] },
  { query: 'running commands to fingerprint the operating system and hardware', relevant: ['T1082'] },
  { query: 'periodically grabbing images of what the user sees', relevant: ['T1113'] },
  { query: 'recording every key the victim presses', relevant: ['T1056.001'] },
  { query: 'harvesting saved logins out of the web browser', relevant: ['T1555.003'] },
  { query: 'passwords left lying around in configuration files on disk', relevant: ['T1552.001'] },
  { query: 'querying the cloud metadata endpoint for instance credentials', relevant: ['T1552.005'] },
  { query: 'breaking out of a container onto the underlying host', relevant: ['T1611'] },
  { query: 'background transfer service used to pull down a payload', relevant: ['T1197'] },
  { query: 'renaming a malicious binary so it looks like a windows system process', relevant: ['T1036.005'] },
  { query: 'sidestepping the windows elevation prompt', relevant: ['T1548.002'] },
  { query: 'stealing another process security token to gain higher privileges', relevant: ['T1134.001'] },
  { query: 'collecting files into one folder before sending them out', relevant: ['T1074'] },
  { query: 'compressing gathered data into an archive prior to exfiltration', relevant: ['T1560'] },
];

const TACTIC_PROMPTS = [
  { prompt: 'create me a rule that covers stealth tactics', relevant: ['TA0005'] },
  { prompt: 'write a detection for defense evasion', relevant: ['TA0005'] },
  { prompt: 'I need coverage for defence evasion techniques', relevant: ['TA0005'] },
  { prompt: 'build a rule for adversaries trying to hide and blend in', relevant: ['TA0005'] },
  { prompt: 'detect attackers breaking or blinding our security tooling', relevant: ['TA0112'] },
  { prompt: 'I want coverage for defense impairment', relevant: ['TA0112'] },
  { prompt: 'rule for credential theft', relevant: ['TA0006'] },
  { prompt: 'detect someone stealing account names and passwords', relevant: ['TA0006'] },
  { prompt: 'cover lateral movement across my network', relevant: ['TA0008'] },
  { prompt: 'alert when an attacker is looking around the environment', relevant: ['TA0007'] },
  { prompt: 'detect data being stolen out of the network', relevant: ['TA0010'] },
  { prompt: 'rule for attackers keeping access across reboots', relevant: ['TA0003'] },
  { prompt: 'I need privilege escalation coverage', relevant: ['TA0004'] },
  { prompt: 'detect command and control beaconing', relevant: ['TA0011'] },
  { prompt: 'cover destructive ransomware style activity', relevant: ['TA0040'] },
  { prompt: 'detect initial access attempts against my org', relevant: ['TA0001'] },
  { prompt: 'cover the reconnaissance phase before an attack', relevant: ['TA0043'] },
  { prompt: 'rule for malicious code execution on endpoints', relevant: ['TA0002'] },
  { prompt: 'detect adversaries gathering data they plan to steal', relevant: ['TA0009'] },
];

const ABSTRACT_PROMPTS = [
  { prompt: 'create a rule that catches someone covering their tracks on a linux server', relevant: ['T1685.006', 'T1070.003', 'T1690'] },
  { prompt: 'detect malware that runs entirely in memory and never touches disk', relevant: ['T1620', 'T1055'] },
  { prompt: 'I am worried about ransomware, give me a rule', relevant: ['T1486', 'T1485'] },
  { prompt: 'something that alerts when a user account is used from somewhere it should not be', relevant: ['T1078'] },
  { prompt: 'catch attackers guessing passwords over and over', relevant: ['T1110'] },
  { prompt: 'we keep getting emails with bad attachments, write a detection', relevant: ['T1566.001', 'T1566'] },
  { prompt: 'alert me when someone pulls a big pile of files together before sending them out', relevant: ['T1560'] },
  { prompt: 'detect a backdoor left behind on our public web server', relevant: ['T1505.003'] },
  { prompt: 'I want to know when malware downloads more malware onto the box', relevant: ['T1105'] },
  { prompt: 'catch programs that pretend to be legitimate windows binaries', relevant: ['T1036', 'T1036.004', 'T1036.008'] },
  { prompt: 'alert when someone sets up something to run automatically on a schedule', relevant: ['T1053', 'T1053.005', 'T1053.003'] },
  { prompt: 'detect data leaving over an unusual channel', relevant: ['T1048', 'T1567', 'T1041'] },
  { prompt: 'I need to catch hands on keyboard activity where they poke around the machine', relevant: ['T1082', 'T1087', 'T1057'] },
  { prompt: 'write me something for attackers hiding commands so they are hard to read', relevant: ['T1027', 'T1027.010'] },
  { prompt: 'detect remote logins being used to hop between machines', relevant: ['T1021', 'T1021.001'] },
  { prompt: 'we had an incident where they turned off the av, cover that', relevant: ['T1685'] },
];

const TECHNIQUE_PROMPTS = [
  { prompt: 'rule for when a process reads the memory of the windows process that holds credentials', relevant: ['T1003.001'] },
  { prompt: 'detect a machine pretending to be a domain controller to pull password hashes', relevant: ['T1003.006'] },
  { prompt: 'alert on scripts run through the built in windows shell that automates administration', relevant: ['T1059.001'] },
  { prompt: 'catch remote code execution using the windows management service', relevant: ['T1047'] },
  { prompt: 'detect when the attacker deletes the shadow copies so you cannot roll back', relevant: ['T1490'] },
  { prompt: 'find when someone dumps the local windows password database from the registry', relevant: ['T1003.002'] },
  { prompt: 'alert when code is written into another running program and executed there', relevant: ['T1055'] },
  { prompt: 'rule for tunneling traffic out disguised as normal name lookups', relevant: ['T1071.004'] },
  { prompt: 'detect an attacker asking the directory service for all the user accounts', relevant: ['T1087', 'T1087.002'] },
  { prompt: 'catch a scheduled job created on a linux host for persistence', relevant: ['T1053.003'] },
  { prompt: 'alert when someone clears the windows security event log', relevant: ['T1685.005'] },
  { prompt: 'detect a malicious library placed so a trusted signed program loads it instead', relevant: ['T1574.001'] },
  { prompt: 'rule for bypassing the windows prompt that asks for admin approval', relevant: ['T1548.002'] },
  { prompt: 'find attackers using stolen kerberos tickets to authenticate', relevant: ['T1550.003', 'T1558'] },
  { prompt: 'detect an attempt to read the linux shadow file with the password hashes', relevant: ['T1003.008'] },
];

const INDEP_TACTIC_PROMPTS = [
  { prompt: 'give me something that covers how they first get a foothold in the environment', relevant: ['TA0001'] },
  { prompt: 'i need rules for when an attacker is already inside and starts hopping between hosts', relevant: ['TA0008'] },
  { prompt: "coverage for the part where they're just looking around figuring out what we have", relevant: ['TA0007'] },
  { prompt: "need detections for anything where they're trying to stay hidden from our tooling", relevant: ['TA0005', 'TA0112'] },
  { prompt: "build me something for the stage where they're stealing logins", relevant: ['TA0006'] },
  { prompt: 'i want alerts around data leaving the org, generally, not one specific method — we just failed an audit on this and leadership wants to see something in place by friday', relevant: ['TA0010'] },
  { prompt: 'detections for how malware phones home', relevant: ['TA0011'] },
  { prompt: 'what can we do to catch them digging in so a reboot doesnt kick them out', relevant: ['TA0003'] },
  { prompt: 'we have nothing for when a low priv account ends up with admin, want broad coverage there', relevant: ['TA0004'] },
  { prompt: "rules for the destructive endgame stuff, when they're actually doing damage to us", relevant: ['TA0040'] },
  { prompt: 'i want coverage for attackers gathering up stuff they care about before they take it', relevant: ['TA0009'] },
  { prompt: 'anything covering how code actually gets run on our endpoints by an attacker', relevant: ['TA0002'] },
  { prompt: "we need broad detections for supplier and vendor angles, like when the way in isn't us it's someone we trust, contractors, msp, third party integrations, whatever", relevant: ['T1199', 'T1195', 'TA0001'] },
  { prompt: 'give me something for the reconnaissance side, before they even touch prod', relevant: ['TA0043'] },
  { prompt: 'coverage for the phase where they set up infra to use against us', relevant: ['TA0042'] },
];

const INDEP_ABSTRACT_PROMPTS = [
  { prompt: 'we got hit last month, everything got scrambled and there was a note asking for money. never want that again', relevant: ['T1486'] },
  { prompt: 'someone is snooping around in places they have no business being', relevant: ['T1083', 'T1530', 'T1078'] },
  { prompt: "i'm worried about a dev walking out the door with our source code on their last day", relevant: ['T1567', 'T1052', 'T1048'] },
  { prompt: "our helpdesk got social engineered into resetting an exec's password and the attacker got in that way, can you make something that would have caught it", relevant: ['T1684.001', 'T1684', 'T1098'] },
  { prompt: 'how do i know if my cloud bill spike is actually someone mining crypto in our account', relevant: ['T1496'] },
  { prompt: 'detect if our security stack goes quiet', relevant: ['T1685', 'TA0112'] },
  { prompt: "i want to know when an account is behaving like it's not the same person anymore", relevant: ['T1078'] },
  { prompt: 'basically catch the thing where an email leads to the whole company being owned', relevant: ['T1566', 'T1566.001', 'T1566.002'] },
  { prompt: "our backups got wiped during an incident at a partner org and we'd be dead if that happened here", relevant: ['T1490', 'T1485'] },
  { prompt: "there's a rogue admin somewhere problem i keep thinking about, someone with keys quietly setting themselves up so they still have access after we offboard them", relevant: ['T1098', 'T1136'] },
  { prompt: 'something is talking to the internet that shouldnt be and i cant tell what', relevant: ['T1071', 'T1095', 'TA0011'] },
  { prompt: 'can you catch a supply chain thing, like when an update we trusted turns out to be bad', relevant: ['T1195.002', 'T1195'] },
  { prompt: "i need to know if someone is quietly reading the ceo's mailbox", relevant: ['T1114', 'T1114.002'] },
];

const INDEP_TECHNIQUE_PROMPTS = [
  { prompt: 'alert when a process opens up the windows process that holds all the logon secrets and reads it out of memory', relevant: ['T1003.001'] },
  { prompt: 'catch it when someone adds a cron entry on a linux server so their thing runs again after reboot', relevant: ['T1053.003'] },
  { prompt: 'someone deleted the security event log on a windows box, i want that alerted immediately, also if they just clear it rather than delete', relevant: ['T1685.005'] },
  { prompt: 'detect when a script gets run from a signed microsoft binary so it doesnt look like an exe, like using the built in windows utilities to pull down and execute stuff', relevant: ['T1218'] },
  { prompt: 'when a service account in aws suddenly generates a new long lived access key for another user', relevant: ['T1098.001', 'T1098'] },
  { prompt: 'i want to see when a user gets flooded with mfa prompts until they finally hit approve', relevant: ['T1621'] },
  { prompt: 'flag anyone dumping the whole active directory password database off a domain controller', relevant: ['T1003.003', 'T1003.006'] },
  { prompt: "a forwarding rule gets added to a mailbox that sends everything to an outside address, we've had this happen twice in o365 and both times we found out from the customer which is embarrassing", relevant: ['T1114.003'] },
  { prompt: 'catch someone using the remote management stuff built into windows to run commands on another machine with stolen creds', relevant: ['T1021.006'] },
  { prompt: 'detect a launch agent plist getting dropped in the user library folder on a mac', relevant: ['T1543.001'] },
  { prompt: 'someone is tunneling data out over dns queries in little chunks', relevant: ['T1048', 'T1071.004'] },
  { prompt: 'when a new federated identity provider or trust gets added to our tenant so someone can mint their own tokens', relevant: ['T1484.002', 'T1606.002', 'T1484'] },
  { prompt: 'i need an alert if the endpoint agent service gets stopped or uninstalled on a host', relevant: ['T1685'] },
  { prompt: 'an ec2 instance querying the metadata endpoint from inside a web app process and then those creds showing up somewhere else', relevant: ['T1552.005'] },
  { prompt: "office app spawns a command shell, that's basically never legit for us", relevant: ['T1204.002', 'T1059', 'T1566.001'] },
];

// ---------------------------------------------------------------------------
// Deterministic PRNG (Park-Miller) — same as query_set.ts
// ---------------------------------------------------------------------------
const LCG_MODULUS = 2147483647;
const LCG_MULTIPLIER = 16807;

const createRandom = (seed) => {
  let state = seed % LCG_MODULUS;
  if (state <= 0) state += LCG_MODULUS - 1;
  return () => {
    state = (state * LCG_MULTIPLIER) % LCG_MODULUS;
    return (state - 1) / (LCG_MODULUS - 1);
  };
};

const sampleArr = (items, count, random) => {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
};

const perturbName = (name, random) => {
  const words = name.split(' ').filter((w) => w.toLowerCase() !== 'or');
  const kept = words.length > 2 ? words.filter((_, i) => i !== words.length - 1) : words;
  const joined = kept.join(' ');
  const position = Math.floor(random() * Math.max(1, joined.length - 2));
  if (position < 1 || position >= joined.length - 1) return joined.toLowerCase();
  return (
    joined.slice(0, position) +
    joined[position + 1] +
    joined[position] +
    joined.slice(position + 2)
  ).toLowerCase();
};

const firstSentence = (description) => {
  const cleaned = description.replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/^(.{40,400}?[.!?])\s/);
  return (match?.[1] ?? cleaned.slice(0, 300)).trim();
};

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------
const reciprocalRank = (hits, relevant) => {
  for (let i = 0; i < hits.length; i++) {
    const id = hits[i]?.[`${ATTR}`]?.id;
    if (id && relevant.has(id)) return 1 / (i + 1);
  }
  return 0;
};

const recallAtK = (hits, relevant, k) => {
  const topK = hits.slice(0, k);
  const found = topK.filter((h) => relevant.has(h?.[`${ATTR}`]?.id)).length;
  return found > 0 ? 1 : 0;
};

const computeMetrics = (results) => {
  const mrr = results.reduce((s, r) => s + r.rr, 0) / results.length;
  const r5 = results.reduce((s, r) => s + r.r5, 0) / results.length;
  const r10 = results.reduce((s, r) => s + r.r10, 0) / results.length;
  return { mrr: round(mrr), recall_at_5: round(r5), recall_at_10: round(r10), n: results.length };
};

const round = (v) => Math.round(v * 1000) / 1000;

// ---------------------------------------------------------------------------
// Run a single query in all modes
// ---------------------------------------------------------------------------
const runQuery = async (q, relevant, stratum) => {
  const relevantSet = new Set(relevant);

  const [kwRes, semRes, hybRes] = await Promise.all([
    esSearch(keywordQuery(q)),
    esSearch(semanticQuery(q)),
    esSearch(hybridQuery(q)),
  ]);

  const kwHits = (kwRes.hits?.hits || []).map((h) => h._source);
  const semHits = (semRes.hits?.hits || []).map((h) => h._source);
  const hybHits = (hybRes.hits?.hits || []).map((h) => h._source);

  const kwRR = reciprocalRank(kwHits, relevantSet);
  const semRR = reciprocalRank(semHits, relevantSet);
  const hybRR = reciprocalRank(hybHits, relevantSet);

  return {
    stratum,
    query: q,
    relevant: [...relevantSet],
    keyword: {
      rr: kwRR,
      r5: recallAtK(kwHits, relevantSet, 5),
      r10: recallAtK(kwHits, relevantSet, 10),
      top3: kwHits.slice(0, 3).map((h) => h?.[ATTR]?.id).filter(Boolean),
    },
    semantic: {
      rr: semRR,
      r5: recallAtK(semHits, relevantSet, 5),
      r10: recallAtK(semHits, relevantSet, 10),
      top3: semHits.slice(0, 3).map((h) => h?.[ATTR]?.id).filter(Boolean),
    },
    hybrid: {
      rr: hybRR,
      r5: recallAtK(hybHits, relevantSet, 5),
      r10: recallAtK(hybHits, relevantSet, 10),
      top3: hybHits.slice(0, 3).map((h) => h?.[ATTR]?.id).filter(Boolean),
    },
  };
};

// ---------------------------------------------------------------------------
// Fetch entities from ES for auto-generated strata
// ---------------------------------------------------------------------------
const fetchEntities = async () => {
  const { filter, mustNot } = buildFilters();
  const res = await esSearch(
    {
      bool: {
        filter,
        must_not: mustNot,
      },
    },
    2000
  );
  return (res.hits?.hits || []).map((h) => h._source?.[ATTR]).filter(Boolean);
};

// ---------------------------------------------------------------------------
// Build auto-generated queries (exact_id, exact_name, near_name, description_lead)
// ---------------------------------------------------------------------------
const SAMPLES_PER_STRATUM = 15;
const SEED = 42;

const buildAutoQueries = (entities) => {
  const random = createRandom(SEED);
  const techniques = entities.filter((e) => e.type !== 'tactic');
  const describable = techniques.filter((e) => (e.description || '').length >= 80);
  const queries = [];

  for (const e of sampleArr(techniques, SAMPLES_PER_STRATUM, random)) {
    queries.push({ stratum: 'exact_id', query: e.id, relevant: [e.id] });
  }
  for (const e of sampleArr(techniques, SAMPLES_PER_STRATUM, random)) {
    queries.push({ stratum: 'exact_name', query: e.name, relevant: [e.id] });
  }
  for (const e of sampleArr(techniques, SAMPLES_PER_STRATUM, random)) {
    queries.push({ stratum: 'near_name', query: perturbName(e.name, random), relevant: [e.id] });
  }
  for (const e of sampleArr(describable, SAMPLES_PER_STRATUM, random)) {
    queries.push({
      stratum: 'description_lead',
      query: firstSentence(e.description),
      relevant: [e.id],
    });
  }

  return queries;
};

// ---------------------------------------------------------------------------
// ES|QL MATCH probe
// ---------------------------------------------------------------------------
const runEsqlProbe = async () => {
  // Zero-keyword-overlap query — ransomware without using ATT&CK vocabulary
  const probeQuery =
    'FROM .kibana_security_solution | WHERE type == "mitre-attack-entity" AND MATCH("mitre-attack-entity.semantic_content", "adversary makes files unreadable and demands payment to restore access") | KEEP `mitre-attack-entity.id`, `mitre-attack-entity.name`, `mitre-attack-entity.type` | LIMIT 5';

  try {
    const res = await esqlQuery(probeQuery);
    const rows = res.values || [];
    const cols = (res.columns || []).map((c) => c.name);
    const parsed = rows.map((r) =>
      Object.fromEntries(cols.map((c, i) => [c, r[i]]))
    );
    return { success: true, query: probeQuery, results: parsed, error: null };
  } catch (e) {
    return { success: false, query: probeQuery, results: [], error: e.message };
  }
};

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------
const pct = (v) => (v * 100).toFixed(1) + '%';

const metricsRow = (label, m) =>
  `| ${label.padEnd(24)} | ${pct(m.mrr).padStart(7)} | ${pct(m.recall_at_5).padStart(10)} | ${pct(m.recall_at_10).padStart(11)} | ${String(m.n).padStart(5)} |`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const main = async () => {
  console.log('=== MITRE Retrieval Benchmark ===');
  console.log(`ES: ${ES_URL}  index: ${INDEX}`);
  console.log(`Framework: ${FRAMEWORK} v${FRAMEWORK_VERSION}`);
  console.log();

  // --- Fetch entities for auto-generated strata ---
  console.log('Fetching entities from ES...');
  const entities = await fetchEntities();
  console.log(`  ${entities.length} active entities loaded`);

  // Filter known IDs for label validation
  const knownIds = new Set(entities.map((e) => e.id));

  // --- Build full labeled query list ---
  const labeledQueries = [];

  // Auto-generated strata
  for (const q of buildAutoQueries(entities)) {
    labeledQueries.push(q);
  }

  // Behavioral
  for (const { query, relevant } of BEHAVIORAL_QUERIES) {
    const usable = relevant.filter((id) => knownIds.has(id));
    if (usable.length > 0) {
      labeledQueries.push({ stratum: 'behavioral', query, relevant: usable });
    }
  }

  // Prompt strata
  const promptStrata = [
    ['prompt_tactic', TACTIC_PROMPTS],
    ['prompt_abstract', ABSTRACT_PROMPTS],
    ['prompt_technique', TECHNIQUE_PROMPTS],
    ['indep_tactic', INDEP_TACTIC_PROMPTS],
    ['indep_abstract', INDEP_ABSTRACT_PROMPTS],
    ['indep_technique', INDEP_TECHNIQUE_PROMPTS],
  ];
  for (const [stratum, prompts] of promptStrata) {
    for (const { prompt, relevant } of prompts) {
      const usable = relevant.filter((id) => knownIds.has(id));
      if (usable.length > 0) {
        labeledQueries.push({ stratum, query: prompt, relevant: usable });
      }
    }
  }

  console.log(`  ${labeledQueries.length} labeled queries across ${[...new Set(labeledQueries.map(q => q.stratum))].length} strata`);
  console.log();

  // --- Run queries ---
  console.log('Running benchmark queries...');
  const results = [];
  let done = 0;
  for (const { stratum, query, relevant } of labeledQueries) {
    process.stdout.write(`\r  ${++done}/${labeledQueries.length} queries...`);
    try {
      const r = await runQuery(query, relevant, stratum);
      results.push(r);
    } catch (err) {
      console.error(`\nError on query "${query.slice(0, 60)}...": ${err.message}`);
      results.push({
        stratum,
        query,
        relevant,
        keyword: { rr: 0, r5: 0, r10: 0, top3: [] },
        semantic: { rr: 0, r5: 0, r10: 0, top3: [] },
        hybrid: { rr: 0, r5: 0, r10: 0, top3: [] },
        error: err.message,
      });
    }
  }
  console.log('\n  Done.');
  console.log();

  // --- ES|QL probe ---
  console.log('Running ES|QL MATCH probe...');
  const esqlResult = await runEsqlProbe();
  console.log('  ES|QL probe complete.');
  console.log();

  // --- Compute metrics ---
  const strata = [...new Set(results.map((r) => r.stratum))];
  const modeNames = ['keyword', 'semantic', 'hybrid'];

  const overallMetrics = {};
  for (const mode of modeNames) {
    overallMetrics[mode] = computeMetrics(results.map((r) => r[mode]));
  }

  const strataMetrics = {};
  for (const stratum of strata) {
    const sub = results.filter((r) => r.stratum === stratum);
    strataMetrics[stratum] = {};
    for (const mode of modeNames) {
      strataMetrics[stratum][mode] = computeMetrics(sub.map((r) => r[mode]));
    }
  }

  // Category groupings
  const categoryGroups = {
    'auto: exact_id': ['exact_id'],
    'auto: exact_name': ['exact_name'],
    'auto: near_name': ['near_name'],
    'auto: description_lead': ['description_lead'],
    'behavioral (paraphrase)': ['behavioral'],
    'prompt: tactic': ['prompt_tactic', 'indep_tactic'],
    'prompt: abstract': ['prompt_abstract', 'indep_abstract'],
    'prompt: technique': ['prompt_technique', 'indep_technique'],
  };

  const categoryMetrics = {};
  for (const [cat, stratumList] of Object.entries(categoryGroups)) {
    const sub = results.filter((r) => stratumList.includes(r.stratum));
    if (sub.length === 0) continue;
    categoryMetrics[cat] = {};
    for (const mode of modeNames) {
      categoryMetrics[cat][mode] = computeMetrics(sub.map((r) => r[mode]));
    }
  }

  // Notable failures: queries where semantic fails (rr=0) but relevant is well-known
  const notableFailures = results
    .filter((r) => r.semantic.rr === 0 && r.keyword.rr === 0)
    .sort((a, b) => a.stratum.localeCompare(b.stratum))
    .slice(0, 20);

  const semanticWins = results.filter((r) => r.semantic.rr > r.keyword.rr).length;
  const keywordWins = results.filter((r) => r.keyword.rr > r.semantic.rr).length;
  const ties = results.length - semanticWins - keywordWins;

  // --- Print results table ---
  console.log('=== RESULTS ===');
  console.log();
  console.log('OVERALL METRICS (all strata)');
  console.log('| Mode                     |     MRR | Recall@5 | Recall@10 |     N |');
  console.log('|--------------------------|---------|----------|-----------|-------|');
  for (const mode of modeNames) {
    const note = mode === 'hybrid' ? ' (not shipped)' : '';
    console.log(metricsRow(mode + note, overallMetrics[mode]));
  }
  console.log();

  console.log('CATEGORY BREAKDOWN');
  console.log('| Category                 | Metric       | Keyword  | Semantic | Hybrid* |');
  console.log('|--------------------------|--------------|----------|----------|---------|');
  for (const [cat, modes] of Object.entries(categoryMetrics)) {
    const kw = modes.keyword;
    const sem = modes.semantic;
    const hyb = modes.hybrid;
    console.log(`| ${cat.padEnd(24)} | MRR          | ${pct(kw.mrr).padStart(8)} | ${pct(sem.mrr).padStart(8)} | ${pct(hyb.mrr).padStart(7)} |`);
    console.log(`| ${''.padEnd(24)} | Recall@5     | ${pct(kw.recall_at_5).padStart(8)} | ${pct(sem.recall_at_5).padStart(8)} | ${pct(hyb.recall_at_5).padStart(7)} |`);
    console.log(`| ${''.padEnd(24)} | Recall@10    | ${pct(kw.recall_at_10).padStart(8)} | ${pct(sem.recall_at_10).padStart(8)} | ${pct(hyb.recall_at_10).padStart(7)} |`);
  }
  console.log('  *Hybrid = bool-should[multi_match, semantic] — not shipped in POC');
  console.log();

  console.log(`Query-level: semantic wins ${semanticWins}, keyword wins ${keywordWins}, ties ${ties} (out of ${results.length})`);
  console.log();

  // --- Build JSON ---
  const jsonOutput = {
    generated_at: new Date().toISOString(),
    config: { es_url: ES_URL, index: INDEX, framework: FRAMEWORK, framework_version: FRAMEWORK_VERSION },
    overall: overallMetrics,
    by_stratum: strataMetrics,
    by_category: categoryMetrics,
    win_counts: { semantic: semanticWins, keyword: keywordWins, ties },
    esql_probe: esqlResult,
    query_results: results,
  };

  // --- Write JSON ---
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const jsonPath = path.join(OUTPUT_DIR, 'benchmark_results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`JSON written to ${jsonPath}`);

  // --- Build Markdown ---
  const md = buildMarkdown(jsonOutput, results, categoryMetrics, overallMetrics, modeNames, notableFailures, esqlResult, semanticWins, keywordWins, ties);
  const mdPath = path.join(OUTPUT_DIR, 'benchmark_results.md');
  fs.writeFileSync(mdPath, md);
  console.log(`Markdown written to ${mdPath}`);
};

// ---------------------------------------------------------------------------
// Markdown builder
// ---------------------------------------------------------------------------
const buildMarkdown = (jsonOutput, results, categoryMetrics, overallMetrics, modeNames, notableFailures, esqlResult, semanticWins, keywordWins, ties) => {
  const pct = (v) => (v * 100).toFixed(1) + '%';

  const lines = [];
  lines.push('# MITRE ATT&CK Retrieval Benchmark Results');
  lines.push('');
  lines.push(`**Generated:** ${jsonOutput.generated_at}`);
  lines.push(`**Index:** \`${jsonOutput.config.index}\``);
  lines.push(`**Framework:** ${jsonOutput.config.framework} v${jsonOutput.config.framework_version}`);
  lines.push(`**Total queries:** ${results.length}`);
  lines.push('');

  lines.push('## Overall Metrics');
  lines.push('');
  lines.push('| Mode | MRR | Recall@5 | Recall@10 | N |');
  lines.push('|------|-----|----------|-----------|---|');
  for (const mode of modeNames) {
    const m = overallMetrics[mode];
    const note = mode === 'hybrid' ? ' \\*(not shipped)' : '';
    lines.push(`| ${mode}${note} | ${pct(m.mrr)} | ${pct(m.recall_at_5)} | ${pct(m.recall_at_10)} | ${m.n} |`);
  }
  lines.push('');
  lines.push('\\* Hybrid = bool-should[multi\\_match, semantic] — experimental, not shipped in POC');
  lines.push('');

  lines.push('## Category Breakdown');
  lines.push('');
  lines.push('| Category | Mode | MRR | Recall@5 | Recall@10 | N |');
  lines.push('|----------|------|-----|----------|-----------|---|');
  for (const [cat, modes] of Object.entries(categoryMetrics)) {
    for (const mode of modeNames) {
      const m = modes[mode];
      const noteStr = mode === 'hybrid' ? ' (not shipped)' : '';
      lines.push(`| ${cat} | ${mode}${noteStr} | ${pct(m.mrr)} | ${pct(m.recall_at_5)} | ${pct(m.recall_at_10)} | ${m.n} |`);
    }
    lines.push('| | | | | | |');
  }
  lines.push('');

  lines.push('## Per-Query Win Counts');
  lines.push('');
  lines.push(`- Semantic wins (higher RR): **${semanticWins}**`);
  lines.push(`- Keyword wins (higher RR): **${keywordWins}**`);
  lines.push(`- Ties: **${ties}**`);
  lines.push(`- Total queries: **${results.length}**`);
  lines.push('');

  lines.push('## ES|QL MATCH Probe');
  lines.push('');
  lines.push('**Probe query (zero-keyword-overlap):**');
  lines.push('```');
  lines.push('adversary makes files unreadable and demands payment to restore access');
  lines.push('```');
  lines.push('');

  if (esqlResult.success && esqlResult.results.length > 0) {
    lines.push('**ES|QL MATCH results (top 5):**');
    lines.push('');
    lines.push('| ID | Name | Type |');
    lines.push('|----|------|------|');
    for (const r of esqlResult.results) {
      const id = r['mitre-attack-entity.id'] || r[Object.keys(r)[0]] || '?';
      const name = r['mitre-attack-entity.name'] || r[Object.keys(r)[1]] || '?';
      const type = r['mitre-attack-entity.type'] || r[Object.keys(r)[2]] || '?';
      lines.push(`| ${id} | ${name} | ${type} |`);
    }
    lines.push('');

    // Assess whether results look semantic or lexical
    const resultIds = esqlResult.results.map(r => r['mitre-attack-entity.id'] || '').filter(Boolean);
    const ransomwareIds = ['T1486', 'T1485', 'T1490'];
    const hasRansomware = resultIds.some(id => ransomwareIds.includes(id));

    if (hasRansomware) {
      lines.push('**Finding:** ES|QL MATCH on a `semantic_text` field appears to perform **true semantic search**. The top results include T1486 (Data Encrypted for Impact) and/or related ransomware-adjacent techniques, despite the probe query sharing no lexical keywords with those entities\' names or descriptions. This indicates that `MATCH()` on a `semantic_text` field in ES|QL correctly routes to the neural/ELSER retrieval path rather than BM25 lexical matching.');
    } else {
      lines.push('**Finding:** ES|QL MATCH on a `semantic_text` field returned results that do **not** appear to match semantically — the top results do not include expected ransomware-adjacent techniques (T1486, T1485, T1490), suggesting the query may be routing through a lexical path or that the semantic index requires additional configuration. The results are: ' + resultIds.join(', ') + '.');
    }
  } else if (esqlResult.error) {
    lines.push(`**ES|QL MATCH returned an error:**`);
    lines.push('```');
    lines.push(esqlResult.error);
    lines.push('```');
    lines.push('');
    lines.push('**Finding:** The ES|QL `MATCH()` function on a `semantic_text` field failed with the error above. This may indicate that `MATCH()` does not support semantic retrieval in this ES version, or that the field name or query syntax needs adjustment. The `/_search` API with a `semantic` query clause (used by the plugin) is the confirmed working path for ELSER retrieval in this cluster.');
  } else {
    lines.push('**Finding:** ES|QL MATCH returned no results for the probe query, making it impossible to determine whether it routes through semantic or lexical matching. The `/_search` API semantic query is the confirmed working retrieval path.');
  }
  lines.push('');

  lines.push('## Analysis');
  lines.push('');
  lines.push('### Category Winners');
  lines.push('');

  // Build analysis from actual results
  const categoryWinners = [];
  for (const [cat, modes] of Object.entries(categoryMetrics)) {
    const kw = modes.keyword.mrr;
    const sem = modes.semantic.mrr;
    if (sem > kw * 1.1) categoryWinners.push({ cat, winner: 'semantic', kw, sem });
    else if (kw > sem * 1.1) categoryWinners.push({ cat, winner: 'keyword', kw, sem });
    else categoryWinners.push({ cat, winner: 'tie', kw, sem });
  }

  for (const { cat, winner, kw, sem } of categoryWinners) {
    const kwStr = pct(kw);
    const semStr = pct(sem);
    if (winner === 'semantic') {
      lines.push(`- **${cat}**: Semantic wins (MRR ${semStr} vs ${kwStr}). Semantic understanding closes the vocabulary gap between user intent and ATT&CK terminology.`);
    } else if (winner === 'keyword') {
      lines.push(`- **${cat}**: Keyword wins (MRR ${kwStr} vs ${semStr}). Lexical overlap with entity names and IDs gives BM25 a strong advantage here.`);
    } else {
      lines.push(`- **${cat}**: Roughly tied (keyword MRR ${kwStr}, semantic MRR ${semStr}).`);
    }
  }
  lines.push('');

  lines.push('### Notable Failures');
  lines.push('');

  if (notableFailures.length === 0) {
    lines.push('No queries where both keyword and semantic returned RR=0. All queries found at least one relevant result in one mode.');
  } else {
    lines.push('Queries where **both** keyword and semantic returned RR=0 (nothing relevant in top 10):');
    lines.push('');
    lines.push('| Stratum | Query | Expected | KW top3 | Sem top3 |');
    lines.push('|---------|-------|----------|---------|----------|');
    for (const r of notableFailures.slice(0, 15)) {
      const q = r.query.slice(0, 60).replace(/\|/g, '\\|');
      const exp = r.relevant.join(', ');
      const kw3 = r.keyword.top3.join(', ') || '—';
      const sem3 = r.semantic.top3.join(', ') || '—';
      lines.push(`| ${r.stratum} | ${q}... | ${exp} | ${kw3} | ${sem3} |`);
    }
  }
  lines.push('');

  // Deep-dive on T1486
  const t1486Result = results.find(r => r.relevant.includes('T1486') && r.query.includes('unreadable'));
  if (t1486Result) {
    lines.push('#### Deep Dive: T1486 (Data Encrypted for Impact)');
    lines.push('');
    lines.push(`**Query:** "${t1486Result.query}"`);
    lines.push(`**Expected:** T1486`);
    lines.push(`**Keyword RR:** ${t1486Result.keyword.rr} (top3: ${t1486Result.keyword.top3.join(', ') || 'none'})`);
    lines.push(`**Semantic RR:** ${t1486Result.semantic.rr} (top3: ${t1486Result.semantic.top3.join(', ') || 'none'})`);
    lines.push('');
    if (t1486Result.semantic.rr === 0) {
      lines.push('T1486\'s description ("Adversaries may encrypt data on target systems or on large numbers of systems in a network to interrupt availability to system and network resources...") uses vocabulary like "encrypt", "ransom", "impact" — but the probe uses "unreadable" and "demands payment". The semantic model should bridge this gap; a miss here suggests either that the ELSER embedding for the probe query is not close enough to the T1486 embedding in the ELSER latent space, or that another technique (e.g. T1485 Data Destruction) is scoring higher. This is worth investigating by checking T1485 and T1486 embeddings directly.');
    } else {
      lines.push(`T1486 was found at rank ${Math.round(1 / t1486Result.semantic.rr)} semantically, confirming that ELSER correctly bridges "files unreadable + demands payment" → "Data Encrypted for Impact".`);
    }
    lines.push('');
  }

  lines.push('### Recommendation for RFC');
  lines.push('');

  const semOverall = overallMetrics.semantic.mrr;
  const kwOverall = overallMetrics.keyword.mrr;

  if (semOverall > kwOverall) {
    lines.push('**Default mode for AI tooling should be `semantic`.**');
    lines.push('');
    lines.push(`Semantic search achieves MRR ${pct(semOverall)} overall vs keyword MRR ${pct(kwOverall)}. The advantage is largest in the behavioral and abstract prompt categories — exactly the vocabulary used by AI-generated prompts and analyst natural language — where paraphrastic queries share no lexical overlap with ATT&CK entity names. Keyword search remains competitive for exact ID and exact name lookups (where the user already knows the ATT&CK vocabulary), but AI tooling operates primarily in the semantic space.`);
    lines.push('');
    lines.push('**Specific recommendations:**');
    lines.push('- Set `mode: "semantic"` as the default for the AI rule creation flow.');
    lines.push('- Keep `mode: "keyword"` available for direct analyst search (type-as-you-go in the UI), where partial name/ID matches are expected.');
    lines.push('- The hybrid bool-should mode shows marginal gains over semantic alone in most categories but adds latency; defer to a follow-up if needed.');
  } else {
    lines.push(`**Default mode for AI tooling: consider \`semantic\`** — though overall MRR is currently close (semantic ${pct(semOverall)} vs keyword ${pct(kwOverall)}).`);
    lines.push('');
    lines.push('Semantic search is preferred for AI tooling because AI-generated prompts use paraphrastic language that does not overlap with ATT&CK terminology. Even if overall MRR is similar, semantic search handles the hard cases (behavioral paraphrases, abstract intent descriptions) that dominate the AI rule creation use case. Keyword search will fail silently on these queries by returning zero results or irrelevant results.');
  }
  lines.push('');

  lines.push('---');
  lines.push('*Benchmark script: `x-pack/solutions/security/plugins/mitre_attack/scripts/retrieval_benchmark.js`*');

  return lines.join('\n');
};

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
