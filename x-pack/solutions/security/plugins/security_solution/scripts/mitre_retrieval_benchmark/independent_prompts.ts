/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * An independently authored prompt set, kept separate from `prompt_queries.ts`.
 *
 * The prompts were written by a model with no access to this repository, no
 * sight of the ATT&CK artifact, and an instruction never to emit a technique
 * identifier or an official ATT&CK name — only the user's words plus a plain
 * description of the behaviour being asked about. The labels below were then
 * assigned from the v19.1 artifact.
 *
 * The split matters: the party that wrote the questions did not know the
 * answers, and the party that assigned the answers did not write the questions.
 * `prompt_queries.ts` fails that test, since the same author did both.
 *
 * `relevant` lists every entity that would be a defensible answer, because
 * these prompts are loose enough that several often are.
 */
export interface IndependentPrompt {
  group: 'tactic' | 'abstract' | 'technique';
  prompt: string;
  relevant: string[];
}

export const independentPrompts: IndependentPrompt[] = [
  // --- tactic ---------------------------------------------------------------
  {
    group: 'tactic',
    prompt: 'give me something that covers how they first get a foothold in the environment',
    relevant: ['TA0001'],
  },
  {
    group: 'tactic',
    prompt: 'i need rules for when an attacker is already inside and starts hopping between hosts',
    relevant: ['TA0008'],
  },
  {
    group: 'tactic',
    prompt: "coverage for the part where they're just looking around figuring out what we have",
    relevant: ['TA0007'],
  },
  {
    group: 'tactic',
    prompt: "need detections for anything where they're trying to stay hidden from our tooling",
    // v19 split concealment (TA0005) from breaking the tooling (TA0112) and this
    // phrasing spans both.
    relevant: ['TA0005', 'TA0112'],
  },
  {
    group: 'tactic',
    prompt: "build me something for the stage where they're stealing logins",
    relevant: ['TA0006'],
  },
  {
    group: 'tactic',
    prompt:
      'i want alerts around data leaving the org, generally, not one specific method — we just failed an audit on this and leadership wants to see something in place by friday',
    relevant: ['TA0010'],
  },
  { group: 'tactic', prompt: 'detections for how malware phones home', relevant: ['TA0011'] },
  {
    group: 'tactic',
    prompt: 'what can we do to catch them digging in so a reboot doesnt kick them out',
    relevant: ['TA0003'],
  },
  {
    group: 'tactic',
    prompt:
      'we have nothing for when a low priv account ends up with admin, want broad coverage there',
    relevant: ['TA0004'],
  },
  {
    group: 'tactic',
    prompt: "rules for the destructive endgame stuff, when they're actually doing damage to us",
    relevant: ['TA0040'],
  },
  {
    group: 'tactic',
    prompt: 'i want coverage for attackers gathering up stuff they care about before they take it',
    relevant: ['TA0009'],
  },
  {
    group: 'tactic',
    prompt: 'anything covering how code actually gets run on our endpoints by an attacker',
    relevant: ['TA0002'],
  },
  {
    group: 'tactic',
    prompt:
      "we need broad detections for supplier and vendor angles, like when the way in isn't us it's someone we trust, contractors, msp, third party integrations, whatever",
    relevant: ['T1199', 'T1195', 'TA0001'],
  },
  {
    group: 'tactic',
    prompt: 'give me something for the reconnaissance side, before they even touch prod',
    relevant: ['TA0043'],
  },
  {
    group: 'tactic',
    prompt: 'coverage for the phase where they set up infra to use against us',
    relevant: ['TA0042'],
  },

  // --- abstract -------------------------------------------------------------
  {
    group: 'abstract',
    prompt:
      'we got hit last month, everything got scrambled and there was a note asking for money. never want that again',
    relevant: ['T1486'],
  },
  {
    group: 'abstract',
    prompt: 'someone is snooping around in places they have no business being',
    relevant: ['T1083', 'T1530', 'T1078'],
  },
  {
    group: 'abstract',
    prompt: "i'm worried about a dev walking out the door with our source code on their last day",
    relevant: ['T1567', 'T1052', 'T1048'],
  },
  {
    group: 'abstract',
    prompt:
      "our helpdesk got social engineered into resetting an exec's password and the attacker got in that way, can you make something that would have caught it",
    relevant: ['T1684.001', 'T1684', 'T1098'],
  },
  {
    group: 'abstract',
    prompt: 'how do i know if my cloud bill spike is actually someone mining crypto in our account',
    relevant: ['T1496'],
  },
  {
    group: 'abstract',
    prompt: 'detect if our security stack goes quiet',
    relevant: ['T1685', 'TA0112'],
  },
  {
    group: 'abstract',
    prompt: "i want to know when an account is behaving like it's not the same person anymore",
    relevant: ['T1078'],
  },
  {
    group: 'abstract',
    prompt: 'basically catch the thing where an email leads to the whole company being owned',
    relevant: ['T1566', 'T1566.001', 'T1566.002'],
  },
  {
    group: 'abstract',
    prompt:
      "our backups got wiped during an incident at a partner org and we'd be dead if that happened here",
    relevant: ['T1490', 'T1485'],
  },
  {
    group: 'abstract',
    prompt:
      "there's a rogue admin somewhere problem i keep thinking about, someone with keys quietly setting themselves up so they still have access after we offboard them",
    relevant: ['T1098', 'T1136'],
  },
  {
    group: 'abstract',
    prompt: 'something is talking to the internet that shouldnt be and i cant tell what',
    relevant: ['T1071', 'T1095', 'TA0011'],
  },
  {
    group: 'abstract',
    prompt:
      'can you catch a supply chain thing, like when an update we trusted turns out to be bad',
    relevant: ['T1195.002', 'T1195'],
  },
  {
    group: 'abstract',
    prompt: "i need to know if someone is quietly reading the ceo's mailbox",
    relevant: ['T1114', 'T1114.002'],
  },

  // --- technique ------------------------------------------------------------
  {
    group: 'technique',
    prompt:
      'alert when a process opens up the windows process that holds all the logon secrets and reads it out of memory',
    relevant: ['T1003.001'],
  },
  {
    group: 'technique',
    prompt:
      'catch it when someone adds a cron entry on a linux server so their thing runs again after reboot',
    relevant: ['T1053.003'],
  },
  {
    group: 'technique',
    prompt:
      'someone deleted the security event log on a windows box, i want that alerted immediately, also if they just clear it rather than delete',
    relevant: ['T1685.005'],
  },
  {
    group: 'technique',
    prompt:
      'detect when a script gets run from a signed microsoft binary so it doesnt look like an exe, like using the built in windows utilities to pull down and execute stuff',
    relevant: ['T1218'],
  },
  {
    group: 'technique',
    prompt:
      'when a service account in aws suddenly generates a new long lived access key for another user',
    relevant: ['T1098.001', 'T1098'],
  },
  {
    group: 'technique',
    prompt:
      'i want to see when a user gets flooded with mfa prompts until they finally hit approve',
    relevant: ['T1621'],
  },
  {
    group: 'technique',
    prompt:
      'flag anyone dumping the whole active directory password database off a domain controller',
    relevant: ['T1003.003', 'T1003.006'],
  },
  {
    group: 'technique',
    prompt:
      "a forwarding rule gets added to a mailbox that sends everything to an outside address, we've had this happen twice in o365 and both times we found out from the customer which is embarrassing",
    relevant: ['T1114.003'],
  },
  {
    group: 'technique',
    prompt:
      'catch someone using the remote management stuff built into windows to run commands on another machine with stolen creds',
    relevant: ['T1021.006'],
  },
  {
    group: 'technique',
    prompt: 'detect a launch agent plist getting dropped in the user library folder on a mac',
    relevant: ['T1543.001'],
  },
  {
    group: 'technique',
    prompt: 'someone is tunneling data out over dns queries in little chunks',
    relevant: ['T1048', 'T1071.004'],
  },
  {
    group: 'technique',
    prompt:
      'when a new federated identity provider or trust gets added to our tenant so someone can mint their own tokens',
    relevant: ['T1484.002', 'T1606.002', 'T1484'],
  },
  {
    group: 'technique',
    prompt: 'i need an alert if the endpoint agent service gets stopped or uninstalled on a host',
    relevant: ['T1685'],
  },
  {
    group: 'technique',
    prompt:
      'an ec2 instance querying the metadata endpoint from inside a web app process and then those creds showing up somewhere else',
    relevant: ['T1552.005'],
  },
  {
    group: 'technique',
    prompt: "office app spawns a command shell, that's basically never legit for us",
    relevant: ['T1204.002', 'T1059', 'T1566.001'],
  },
];

/**
 * Prompts from the generated set that were deliberately not labelled, recorded
 * so the exclusions are visible rather than quietly dropped. Both ask for
 * something ATT&CK does not model as an entity, so any label would be inventing
 * ground truth to suit the benchmark.
 */
export const unlabelledPrompts = [
  {
    prompt:
      "a laptop was stolen from a car in the parking garage and we're not sure if anyone logged into it after, want something that flags weird activity on a machine we think should be dark",
    reason: 'Physical theft followed by unspecified activity; no ATT&CK entity corresponds.',
  },
  {
    prompt:
      'we run a lot of macs in engineering and honestly i have zero visibility into whether any of them are compromised, give me anything meaningful',
    reason: 'A request for coverage in general, with no behaviour to match against.',
  },
];
