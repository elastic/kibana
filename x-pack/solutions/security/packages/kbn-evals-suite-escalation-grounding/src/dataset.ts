/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0. Use of this file is governed by the Elastic License
 * 2.0.
 */

import type { CaseValidationIssue, EscalationCase, SeededEvent } from './types';

const note = (message: string): SeededEvent => ({
  type: 'user_message',
  data: { message },
});
const comment = (text: string, title?: string): SeededEvent => ({
  type: 'text_note',
  ...(title ? { data: { text, title } } : { data: { text } }),
});

/**
 * Grounded-QA set for the escalation summary and escalation-context chat
 * (security-team#19927, gap G19).
 *
 * Each case is an escalation with 2–5 linked investigations carrying distinct
 * planted facts. Every case has one fact that exists only in the LAST linked
 * investigation, so dropping that investigation from the context must reduce
 * planted-fact recall (the mutation test in `escalation_world.test.ts`).
 *
 * All labels are deterministic: recall and hallucination graders match planted
 * fact keys, never an LLM's opinion. The only LLM in the loop is the
 * ClaimGrounding judge.
 */
export const escalationCases: EscalationCase[] = [
  {
    id: 'case-01-credential-access',
    description:
      'Three investigations into a credential-access campaign; escalation must reflect all three, including the last-minute discovery.',
    investigations: [
      {
        id: 'inv-1',
        title: 'Suspicious PowerShell on WEB01',
        events: [
          note(
            'Encoded PowerShell spawned by winword.exe on WEB01 (host.id hst_web01). Decoded command fetched a second stage from http://198.51.100.7/x.ps1.'
          ),
          comment(
            'Process tree confirms office-app parent. The downloader wrote to C:\\Temp\\stage2.ps1 and set a Run key persistence value named UpdaterCore.',
            'Persistence note'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Kerberoasting noise on DC01',
        events: [
          note(
            'DC01 (host.id hst_dc01) logged 4769 requests with RC4 encryption for service accounts svc_backup and svc_sql during a 9-minute window.'
          ),
          comment('Cracked account was svc_backup; password reset completed at 14:05 UTC.'),
        ],
      },
      {
        id: 'inv-3',
        title: 'Late finding: C2 beacon',
        events: [
          note(
            'New finding after the first two were closed: WEB01 beacons every 30s to 203.0.113.44:8443 with a JA3 fingerprint 6734f37431670b3ab429227e35cadc6e.'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: '198.51.100.7',
        text: 'The second stage was fetched from 198.51.100.7 on WEB01.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: 'UpdaterCore',
        text: 'Persistence used a Run key named UpdaterCore.',
        investigation: 0,
      },
      {
        id: 'f3',
        key: 'svc_backup',
        text: 'The Kerberoasted and cracked account was svc_backup.',
        investigation: 1,
      },
      {
        id: 'f4',
        key: '203.0.113.44',
        text: 'WEB01 beacons to C2 203.0.113.44:8443 every 30 seconds (last investigation only).',
        investigation: 2,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'Which host downloaded the second stage, and from what IP?',
        answer: 'WEB01 downloaded it from 198.51.100.7.',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'Which service account was Kerberoasted and cracked?',
        answer: 'svc_backup was cracked and its password reset at 14:05 UTC.',
        factIds: ['f3'],
      },
      {
        id: 'q3',
        question:
          'Is there any command-and-control activity in the linked investigations? If so, where does it beacon to?',
        answer:
          'Yes — WEB01 beacons every 30 seconds to 203.0.113.44:8443 with JA3 fingerprint 6734f37431670b3ab429227e35cadc6e.',
        factIds: ['f4'],
      },
    ],
  },
  {
    id: 'case-02-ransomware-prep',
    description:
      'Escalation over ransomware preparation across two hosts; the last investigation holds the only exfiltration evidence.',
    investigations: [
      {
        id: 'inv-1',
        title: 'Shadow copy deletion on FIN-WS-2',
        events: [
          note(
            'vssadmin delete shadows /all executed on FIN-WS-2 (host.id hst_fin02) by user corp\\j.hale at 03:12 UTC.'
          ),
          comment(
            'Audit log shows the same user disabled Windows Defender real-time protection 4 minutes earlier.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Mass file renames on FS01',
        events: [
          note(
            'File server FS01 (host.id hst_fs01) recorded 41,000 rename operations in 6 minutes; extensions changed to .lockd.'
          ),
          comment(
            'A ransom note named RESTORE-FILES.txt was dropped in every affected share.',
            'Note dropped'
          ),
        ],
      },
      {
        id: 'inv-3',
        title: 'Follow-up: staging and exfiltration',
        events: [
          note(
            'Follow-up investigation: before encryption, 22 GB was staged in C:\\Windows\\Temp\\rdpd on FS01 and uploaded to cloud storage bucket exfil-drop-7731.storage.example over HTTPS.'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: 'vssadmin',
        text: 'Shadow copies were deleted with vssadmin on FIN-WS-2.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: '.lockd',
        text: 'Files were renamed with the .lockd extension on FS01.',
        investigation: 1,
      },
      {
        id: 'f3',
        key: 'RESTORE-FILES.txt',
        text: 'The ransom note was RESTORE-FILES.txt.',
        investigation: 1,
      },
      {
        id: 'f4',
        key: 'exfil-drop-7731',
        text: '22 GB was exfiltrated to bucket exfil-drop-7731 before encryption (last investigation only).',
        investigation: 2,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'How were volume shadow copies removed, and on which host?',
        answer: 'vssadmin delete shadows /all was run on FIN-WS-2.',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'What ransom note filename was dropped on the file server?',
        answer: 'RESTORE-FILES.txt.',
        factIds: ['f3'],
      },
      {
        id: 'q3',
        question: 'Was any data exfiltrated before encryption? If so, where did it go?',
        answer:
          'Yes — 22 GB staged in C:\\Windows\\Temp\\rdpd was uploaded to bucket exfil-drop-7731.storage.example.',
        factIds: ['f4'],
      },
    ],
  },
  {
    id: 'case-03-supply-chain',
    description:
      'Four investigations into a compromised CI pipeline; each holds one artifact of the intrusion chain, the last holds the signing key theft.',
    investigations: [
      {
        id: 'inv-1',
        title: 'Malicious PR merge on build runner',
        events: [
          note(
            'PR #4471 merged by user svc-ci-bot modified .github/workflows/deploy.yml on runner ci-runner-9 to curl a script from http://203.0.113.9/init.sh.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Dependency confusion in internal registry',
        events: [
          note(
            'Package internal-string-utils version 99.99.99 appeared in the internal npm registry from an external namespace, not the trusted publisher.'
          ),
          comment(
            'Registry logs show the upload came from API key ci-publish-key-31f2.',
            'Registry forensics'
          ),
        ],
      },
      {
        id: 'inv-3',
        title: 'Backdoored artifact shipped',
        events: [
          note(
            'Build 8842 of artifact edge-gateway-2.14.0.tgz contains a postinstall hook calling resolve-dns.example at package install time.'
          ),
        ],
      },
      {
        id: 'inv-4',
        title: 'Signing key compromise',
        events: [
          note(
            'Final investigation: the artifact signing key gpg-key-2026-C (id 4F2A91C7) was exfiltrated from the runner keychain to 198.51.100.99; three artifacts were signed with it after exfiltration.'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: 'PR #4471',
        text: 'PR #4471 modified the deploy workflow on ci-runner-9.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: 'internal-string-utils',
        text: 'The dependency-confusion package was internal-string-utils@99.99.99.',
        investigation: 1,
      },
      {
        id: 'f3',
        key: 'edge-gateway-2.14.0.tgz',
        text: 'Build 8842 of edge-gateway-2.14.0.tgz carried the postinstall backdoor.',
        investigation: 2,
      },
      {
        id: 'f4',
        key: '4F2A91C7',
        text: 'Signing key gpg-key-2026-C (4F2A91C7) was exfiltrated to 198.51.100.99 (last investigation only).',
        investigation: 3,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'Which pull request was used to modify the deployment workflow?',
        answer: 'PR #4471, merged by svc-ci-bot.',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'Which package version was planted through dependency confusion?',
        answer: 'internal-string-utils version 99.99.99.',
        factIds: ['f2'],
      },
      {
        id: 'q3',
        question: 'Which artifact build contained the backdoor, and what did the hook do?',
        answer:
          'Build 8842 of edge-gateway-2.14.0.tgz; its postinstall hook called resolve-dns.example.',
        factIds: ['f3'],
      },
      {
        id: 'q4',
        question: 'Was the artifact signing key stolen? Which key, and where did it go?',
        answer:
          'Yes — gpg-key-2026-C (id 4F2A91C7) was exfiltrated from the runner keychain to 198.51.100.99, and three artifacts were signed with it afterwards.',
        factIds: ['f4'],
      },
    ],
  },
  {
    id: 'case-04-insider',
    description:
      'Insider-risk escalation over a departing employee; the last investigation alone proves the USB exfiltration.',
    investigations: [
      {
        id: 'inv-1',
        title: 'Bulk download from corporate drive',
        events: [
          note(
            'User m.reyes downloaded 1,847 documents (3.1 GB) from the corporate drive in 40 minutes on their last working day.'
          ),
          comment('Downloads included the folder /Engineering/Roadmaps/2027.', 'What was taken'),
        ],
      },
      {
        id: 'inv-2',
        title: 'Personal mail forwarding rule',
        events: [
          note(
            'A mailbox rule forwarding mail with subject containing "invoice" to m.reyes.personal@mail-example.com was created at 16:41 UTC.'
          ),
        ],
      },
      {
        id: 'inv-3',
        title: 'Off-hours VPN and USB',
        events: [
          note(
            'At 02:03 UTC m.reyes connected from an unmanaged device and a USB mass-storage device (serial SN-88012-KE) mounted; 2.9 GB copied to it per DLP sensors before the session ended.'
          ),
          comment(
            'The unmanaged device was last seen on guest Wi-Fi with MAC 9c:b2:0f:41:aa:70.',
            'Device note'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: '1,847',
        text: '1,847 documents were bulk-downloaded by m.reyes.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: 'm.reyes.personal@mail-example.com',
        text: 'Mail was forwarded to m.reyes.personal@mail-example.com.',
        investigation: 1,
      },
      {
        id: 'f3',
        key: 'SN-88012-KE',
        text: 'A USB device with serial SN-88012-KE received 2.9 GB at 02:03 UTC (last investigation only).',
        investigation: 2,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'How many documents did the departing employee download, and when?',
        answer: '1,847 documents (3.1 GB) in 40 minutes on their last working day.',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'Where was corporate mail being forwarded?',
        answer:
          'To m.reyes.personal@mail-example.com, via a rule on subjects containing "invoice".',
        factIds: ['f2'],
      },
      {
        id: 'q3',
        question: 'Is there evidence of data leaving on removable media? Which device?',
        answer:
          'Yes — USB mass-storage device serial SN-88012-KE was mounted at 02:03 UTC and 2.9 GB was copied to it.',
        factIds: ['f3'],
      },
    ],
  },
  {
    id: 'case-05-cloud-takeover',
    description:
      'Escalation spanning five investigations into a cloud account takeover; the last investigation holds the cross-account role creation.',
    investigations: [
      {
        id: 'inv-1',
        title: 'Impossible travel sign-in',
        events: [
          note(
            'Sign-in for admin@corp from Lagos 11 minutes after a successful sign-in from Warsaw; session token replay suspected on IP 102.133.0.0/16 egress 102.133.44.9.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'MFA fatigue then approval',
        events: [
          note(
            '38 MFA push notifications sent to the admin phone in 4 minutes; one approved at 09:58 UTC after which a new session was issued.'
          ),
        ],
      },
      {
        id: 'inv-3',
        title: 'New access key created',
        events: [
          note(
            'IAM user deploy-prod received a new long-lived access key AKIA6Example9F2K within the attacker session; old keys left in place.'
          ),
        ],
      },
      {
        id: 'inv-4',
        title: 'S3 enumeration',
        events: [
          note(
            'api-gateway logs show ListBuckets and HeadObject sweeps at 6,000 requests/minute from AS65111; bucket corp-backup-eu listed in full.'
          ),
          comment('Enumeration stopped abruptly at 10:41 UTC.', 'Timeline note'),
        ],
      },
      {
        id: 'inv-5',
        title: 'Persistence: cross-account role',
        events: [
          note(
            'Final investigation: role corp-org-delegated-admin trusting external account 9911-2233-4455 was created at 10:44 UTC — three minutes after enumeration stopped — and is the only persistence mechanism found.'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: 'Lagos',
        text: 'The impossible-travel sign-in came from Lagos.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: '38',
        text: '38 MFA pushes were sent before one was approved.',
        investigation: 1,
      },
      {
        id: 'f3',
        key: 'AKIA6Example9F2K',
        text: 'A new access key AKIA6Example9F2K was created for deploy-prod.',
        investigation: 2,
      },
      {
        id: 'f4',
        key: 'corp-backup-eu',
        text: 'Bucket corp-backup-eu was fully listed during enumeration.',
        investigation: 3,
      },
      {
        id: 'f5',
        key: '9911-2233-4455',
        text: 'A cross-account role trusting external account 9911-2233-4455 was created at 10:44 UTC (last investigation only).',
        investigation: 4,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'Where did the suspicious second sign-in originate?',
        answer: 'Lagos, 11 minutes after the Warsaw sign-in (egress IP 102.133.44.9).',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'How did the attacker get past MFA?',
        answer: 'MFA fatigue — 38 pushes in 4 minutes, one approved at 09:58 UTC.',
        factIds: ['f2'],
      },
      {
        id: 'q3',
        question: 'What new credential was created in the compromised account?',
        answer: 'Long-lived access key AKIA6Example9F2K for IAM user deploy-prod.',
        factIds: ['f3'],
      },
      {
        id: 'q4',
        question: 'Which backup bucket was enumerated?',
        answer: 'corp-backup-eu, listed in full from AS65111.',
        factIds: ['f4'],
      },
      {
        id: 'q5',
        question: 'What persistence did the attacker leave behind in the cloud account?',
        answer:
          'Role corp-org-delegated-admin trusting external account 9911-2233-4455, created at 10:44 UTC.',
        factIds: ['f5'],
      },
    ],
  },
  {
    id: 'case-06-phish-to-fraud',
    description:
      'Escalation linking two investigations into a finance-department phishing incident; the last investigation holds the vendor-bank-detail change.',
    investigations: [
      {
        id: 'inv-1',
        title: 'OAuth consent phishing',
        events: [
          note(
            'Finance user a.nowak granted OAuth app "PDFMerge Pro" (client id 3f8c21aa-redirect.example) consent after a phishing mail; app holds mail.read and mail.send.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Invoice fraud follow-up',
        events: [
          note(
            'Follow-up: the app read 61 invoice mails and sent 4 replies from a.nowak; one reply changed vendor payment details to IBAN LT00 0000 0000 0000 8871 at vendor Meridian Logistics.'
          ),
          comment(
            'Finance confirmed 12,400 EUR was already wired to the new IBAN.',
            'Loss confirmed'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: 'PDFMerge Pro',
        text: 'The consent-phishing app was PDFMerge Pro.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: 'LT00 0000 0000 0000 8871',
        text: 'Payment details were changed to IBAN LT00 0000 0000 0000 0000 8871 (last investigation only).',
        investigation: 1,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'Which OAuth application did the phishing mail lead the user to install?',
        answer: 'PDFMerge Pro (client id 3f8c21aa-redirect.example), with mail.read and mail.send.',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'Did any money actually leave? How much and to where?',
        answer:
          'Yes — 12,400 EUR wired to IBAN LT00 0000 0000 0000 8871 for vendor Meridian Logistics.',
        factIds: ['f2'],
      },
    ],
  },
  {
    id: 'case-07-iot-lateral',
    description:
      'Escalation over an IoT-derived intrusion; three investigations, the last one isolates the exact vulnerable device.',
    investigations: [
      {
        id: 'inv-1',
        title: 'Anomalous DNS from camera VLAN',
        events: [
          note(
            '47,000 TXT queries for random subdomains under dns-tunnel.example from the camera VLAN 10.20.8.0/22 over the weekend.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Jump host compromise',
        events: [
          note(
            'Jump host ops-jump-1 (10.20.4.15) had sshd listening on 0.0.0.0 with password auth; successful root login from 10.20.8.77 at 01:14 Sunday.'
          ),
          comment('authorized_keys gained an ed25519 key comment ops-tunnel-2026.', 'Persistence'),
        ],
      },
      {
        id: 'inv-3',
        title: 'Device identification',
        events: [
          note(
            'Final investigation: 10.20.8.77 resolves to lobby camera CAM-LOB-03 (firmware 2.1.7, CVE-2026-3314 unauthenticated RTSP bypass); it is the patient-zero device for the whole incident.'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: 'dns-tunnel.example',
        text: 'DNS tunneling used the domain dns-tunnel.example.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: 'ops-tunnel-2026',
        text: 'The attacker key on ops-jump-1 had comment ops-tunnel-2026.',
        investigation: 1,
      },
      {
        id: 'f3',
        key: 'CAM-LOB-03',
        text: 'Patient zero was lobby camera CAM-LOB-03, firmware 2.1.7 via CVE-2026-3314 (last investigation only).',
        investigation: 2,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'How did the attacker keep access to the jump host?',
        answer: 'An ed25519 key with comment ops-tunnel-2026 was added to root authorized_keys.',
        factIds: ['f2'],
      },
      {
        id: 'q2',
        question: 'Which physical device was patient zero, and what vulnerability was used?',
        answer:
          'Lobby camera CAM-LOB-03, firmware 2.1.7, via CVE-2026-3314 unauthenticated RTSP bypass.',
        factIds: ['f3'],
      },
    ],
  },
  {
    id: 'case-08-crypto-mining',
    description:
      'Escalation over crypto-mining in the compute cluster; the last investigation ties it to the compromised service mesh.',
    investigations: [
      {
        id: 'inv-1',
        title: 'Stratum traffic from compute nodes',
        events: [
          note(
            'Compute nodes cn-04 through cn-11 opened persistent TLS connections to pool stratum+tcp://pool.mining-example.com:3333; CPU baseline rose from 12% to 97%.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Cron-based miner persistence',
        events: [
          note(
            'Root crontab on affected nodes runs /dev/shm/.kdev every 5 minutes; binary is XMRig 6.21.1 stripped, wallet hash 4A7dR...'
          ),
          comment('The binary masquerades as a kernel helper in ps output.', 'Masquerade note'),
        ],
      },
      {
        id: 'inv-3',
        title: 'Entry point: service mesh',
        events: [
          note(
            'Final investigation: entry was a compromised service-mesh sidecar token (JWT audience istio-ingress, sub svc-legacy-api); the token was replayed from 198.51.100.201 to schedule the miner jobs cluster-wide.'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: 'pool.mining-example.com',
        text: 'Mining traffic went to pool.mining-example.com:3333.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: '/dev/shm/.kdev',
        text: 'The miner persisted via /dev/shm/.kdev in root crontab.',
        investigation: 1,
      },
      {
        id: 'f3',
        key: 'svc-legacy-api',
        text: 'The replayed service-mesh token belonged to svc-legacy-api (last investigation only).',
        investigation: 2,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'Which mining pool were the compute nodes talking to?',
        answer: 'stratum+tcp://pool.mining-example.com:3333.',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'How was the miner kept running on the nodes?',
        answer: 'A root crontab entry running /dev/shm/.kdev every 5 minutes.',
        factIds: ['f2'],
      },
      {
        id: 'q3',
        question: 'How did the miner get into the cluster in the first place?',
        answer:
          'A compromised service-mesh sidecar token for svc-legacy-api was replayed from 198.51.100.201 to schedule the jobs.',
        factIds: ['f3'],
      },
    ],
  },
];

/**
 * Deterministic dataset checks: question facts must live in exactly one
 * investigation, and every case must have a fact unique to its LAST linked
 * investigation (the mutation target). Exported for the unit tests.
 */
export const validateCases = (cases: EscalationCase[]): CaseValidationIssue[] => {
  const issues: CaseValidationIssue[] = [];
  for (const c of cases) {
    if (c.investigations.length < 2 || c.investigations.length > 5) {
      issues.push({ caseId: c.id, problem: `N=${c.investigations.length} outside 2-5` });
    }
    const last = c.investigations.length - 1;
    if (!c.plantedFacts.some((fact) => fact.investigation === last)) {
      issues.push({ caseId: c.id, problem: 'no fact unique to the last investigation' });
    }
    const keys = new Set(c.plantedFacts.map((f) => f.key));
    if (keys.size !== c.plantedFacts.length) {
      issues.push({ caseId: c.id, problem: 'duplicate planted fact keys' });
    }
    // Every fact key must actually appear in the events of its investigation.
    for (const fact of c.plantedFacts) {
      const events = c.investigations[fact.investigation];
      const haystack = events.events.map((e) => Object.values(e.data).join(' ')).join(' ');
      if (!haystack.includes(fact.key)) {
        issues.push({
          caseId: c.id,
          problem: `fact ${fact.id} key "${fact.key}" not present in ${events.id} events`,
        });
      }
    }
    for (const q of c.questions) {
      const homes = new Set(
        q.factIds
          .map((id) => c.plantedFacts.find((f) => f.id === id)?.investigation)
          .filter((i): i is number => i !== undefined)
      );
      if (homes.size !== 1) {
        issues.push({
          caseId: c.id,
          problem: `question ${q.id} facts span ${homes.size} investigations (need exactly 1)`,
        });
      }
      const missing = q.factIds.filter((id) => !c.plantedFacts.some((f) => f.id === id));
      if (missing.length > 0) {
        issues.push({ caseId: c.id, problem: `question ${q.id} references unknown facts` });
      }
    }
  }
  return issues;
};
