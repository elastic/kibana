/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { containsToken } from './grading';
import type { CaseValidationIssue, EscalationCase, SeededEvent } from './types';

// Both helpers seed `text_note`: `_add_events` rejects built-in types such as `user_message`
// with a 400, so journal-style facts ride on the custom event type too.
const note = (text: string): SeededEvent => ({
  type: 'text_note',
  data: { text },
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
        key: 'exfil-drop-7731.storage.example',
        text: '22 GB was exfiltrated to bucket exfil-drop-7731.storage.example before encryption (last investigation only).',
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
  {
    id: 'case-09-webshell-to-database',
    description:
      'Two investigations: an IIS web shell, then the database export it enabled (last investigation only).',
    investigations: [
      {
        id: 'inv-1',
        title: 'Web shell on IIS app server',
        events: [
          note(
            'Web shell help.aspx dropped in C:\\inetpub\\wwwroot\\uploads on APP07 (host.id hst_app07) by w3wp.exe; first request came from 192.0.2.55 at 02:17 UTC.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Lateral movement to SQL',
        events: [
          note(
            'From APP07 the attacker authenticated to SQL02 as sa_reporting via xp_cmdshell and exported table dbo.CardHolders (412,090 rows).'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: 'help.aspx',
        text: 'The web shell was help.aspx on APP07.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: '192.0.2.55',
        text: 'The first web shell request came from 192.0.2.55.',
        investigation: 0,
      },
      {
        id: 'f3',
        key: 'dbo.CardHolders',
        text: 'The table dbo.CardHolders was exported from SQL02 (last investigation only).',
        investigation: 1,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'What was the web shell file called and which IP made the first request?',
        answer: 'help.aspx, first requested from 192.0.2.55.',
        factIds: ['f1', 'f2'],
      },
      {
        id: 'q2',
        question: 'Was any database data exported after the web shell landed?',
        answer: 'Yes, the table dbo.CardHolders was exported from SQL02 via xp_cmdshell.',
        factIds: ['f3'],
      },
    ],
  },
  {
    id: 'case-10-oauth-consent-phish',
    description:
      'Three investigations into an OAuth consent phish; the last holds the SharePoint bulk download.',
    investigations: [
      {
        id: 'inv-1',
        title: 'Malicious OAuth app consent',
        events: [
          note(
            'User l.novak consented to OAuth app Docu-Sync Helper (client id 7c1e-44ab-b9d2) requesting Mail.ReadWrite and Files.Read.All.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Mailbox rule created',
        events: [
          note(
            'Inbox rule Invoice-Fwd forwards messages containing the word invoice to ext-collector@mail-example.net; created 08:03 UTC from the same session.'
          ),
        ],
      },
      {
        id: 'inv-3',
        title: 'Graph API bulk download',
        events: [
          note(
            'Final investigation: the app pulled 3,204 files from SharePoint site Finance-Q3 via Graph API between 08:10 and 08:42 UTC.'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: '7c1e-44ab-b9d2',
        text: 'The malicious OAuth app had client id 7c1e-44ab-b9d2.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: 'ext-collector@mail-example.net',
        text: 'An inbox rule forwarded invoices to ext-collector@mail-example.net.',
        investigation: 1,
      },
      {
        id: 'f3',
        key: 'Finance-Q3',
        text: 'The app bulk-downloaded the SharePoint site Finance-Q3 (last investigation only).',
        investigation: 2,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'What client id did the malicious OAuth app use?',
        answer: 'Client id 7c1e-44ab-b9d2.',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'Where did the mailbox rule forward mail?',
        answer: 'To ext-collector@mail-example.net.',
        factIds: ['f2'],
      },
      {
        id: 'q3',
        question: 'Which SharePoint site was bulk downloaded?',
        answer: 'The site Finance-Q3, 3,204 files via Graph API.',
        factIds: ['f3'],
      },
    ],
  },
  {
    id: 'case-11-k8s-breakout',
    description: 'Four investigations into a Kubernetes breakout; the last holds the secrets dump.',
    investigations: [
      {
        id: 'inv-1',
        title: 'Privileged pod created',
        events: [
          note(
            'Pod debug-shell-x2 was created in namespace payments with privileged true and hostPID true by service account ci-deployer.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Node escape',
        events: [
          note(
            'From the pod, nsenter into PID 1 on node gke-prod-pool2-7f3a gave the attacker root on the node.'
          ),
        ],
      },
      {
        id: 'inv-3',
        title: 'Kubelet credential theft',
        events: [
          note(
            'The kubelet client certificate under /var/lib/kubelet/pki/ was copied to 203.0.113.77 over SCP.'
          ),
        ],
      },
      {
        id: 'inv-4',
        title: 'Secrets dump',
        events: [
          note(
            'Final investigation: 14 Secrets in namespace payments were read, including stripe-live-key and db-master-creds.'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: 'debug-shell-x2',
        text: 'The privileged pod was debug-shell-x2.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: 'gke-prod-pool2-7f3a',
        text: 'The node escape landed on gke-prod-pool2-7f3a.',
        investigation: 1,
      },
      {
        id: 'f3',
        key: '203.0.113.77',
        text: 'The kubelet certificate was copied to 203.0.113.77.',
        investigation: 2,
      },
      {
        id: 'f4',
        key: 'stripe-live-key',
        text: 'The Secret stripe-live-key was read (last investigation only).',
        investigation: 3,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'Which pod was created with privileged settings?',
        answer: 'The pod debug-shell-x2 in namespace payments.',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'Where was the kubelet client certificate sent?',
        answer: 'It was copied to 203.0.113.77 over SCP.',
        factIds: ['f3'],
      },
      {
        id: 'q3',
        question: 'Which payment-related secret was read?',
        answer: 'The Secret stripe-live-key, along with db-master-creds.',
        factIds: ['f4'],
      },
    ],
  },
  {
    id: 'case-12-vpn-brute-force',
    description:
      'Two investigations: a VPN brute-force, then the successful login and the share it pulled (last only).',
    investigations: [
      {
        id: 'inv-1',
        title: 'VPN brute-force',
        events: [
          note(
            'VPN gateway vpn-gw-2 logged 9,400 failed logins for user t.berg from 45.155.205.0/24 over 40 minutes.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Successful login and share access',
        events: [
          note(
            'Final investigation: the login for t.berg finally succeeded at 05:52 UTC from 45.155.205.19 and the session pulled the share \\\\fs02\\hr-payroll.'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: 'vpn-gw-2',
        text: 'The brute-force targeted the gateway vpn-gw-2.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: 'hr-payroll',
        text: 'The compromised session read the hr-payroll share (last investigation only).',
        investigation: 1,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'Which VPN gateway was brute-forced?',
        answer: 'The gateway vpn-gw-2.',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'After the login succeeded, which file share was accessed?',
        answer: 'The hr-payroll share on fs02.',
        factIds: ['f2'],
      },
    ],
  },
  {
    id: 'case-13-browser-extension',
    description:
      'Three investigations into a hijacked browser extension; the last holds the CRM export.',
    investigations: [
      {
        id: 'inv-1',
        title: 'Extension force-updated',
        events: [
          note(
            'Extension Tab Saver Plus was force-updated on 340 managed Chrome profiles after its publisher account changed owner.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Cookie exfiltration',
        events: [
          note(
            'The update injects a content script that posts cookies to https://cdn-metrics-sync.example/c every 60 seconds.'
          ),
        ],
      },
      {
        id: 'inv-3',
        title: 'CRM session replay',
        events: [
          note(
            'Final investigation: stolen session cookies were replayed against the CRM tenant acme-crm-eu to export 1,120 contacts.'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: 'Tab Saver Plus',
        text: 'The hijacked extension was Tab Saver Plus.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: 'cdn-metrics-sync.example',
        text: 'Cookies were posted to cdn-metrics-sync.example.',
        investigation: 1,
      },
      {
        id: 'f3',
        key: 'acme-crm-eu',
        text: 'The replayed cookies hit the CRM tenant acme-crm-eu (last investigation only).',
        investigation: 2,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'Which browser extension was force-updated?',
        answer: 'Tab Saver Plus, on 340 managed Chrome profiles.',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'Where did the extension send stolen cookies?',
        answer: 'To https://cdn-metrics-sync.example/c every 60 seconds.',
        factIds: ['f2'],
      },
      {
        id: 'q3',
        question: 'Which SaaS tenant was accessed with the stolen cookies?',
        answer: 'The CRM tenant acme-crm-eu, where 1,120 contacts were exported.',
        factIds: ['f3'],
      },
    ],
  },
  {
    id: 'case-14-rogue-access-point',
    description:
      'Two investigations: a rogue wireless AP detected, then its physical location and impact (last only).',
    investigations: [
      {
        id: 'inv-1',
        title: 'Rogue SSID detected',
        events: [
          note(
            'The floor 3 wireless sensor detected SSID Corp-Guest-Free (BSSID 3C:52:82:AA:10:F4) impersonating the guest network.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Physical device found',
        events: [
          note(
            'Final investigation: the rogue AP was a Raspberry Pi plugged into wall port WP-3-114, and it captured NTLM hashes for 27 users.'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: '3C:52:82:AA:10:F4',
        text: 'The rogue BSSID was 3C:52:82:AA:10:F4.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: 'WP-3-114',
        text: 'The rogue AP was plugged into wall port WP-3-114 (last investigation only).',
        investigation: 1,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'What BSSID did the rogue access point use?',
        answer: 'The BSSID 3C:52:82:AA:10:F4.',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'Where was the rogue device physically connected?',
        answer: 'Wall port WP-3-114, a Raspberry Pi that captured NTLM hashes.',
        factIds: ['f2'],
      },
    ],
  },
  {
    id: 'case-15-bec-wire-fraud',
    description:
      'Three investigations into business email compromise; the last traces the stolen funds.',
    investigations: [
      {
        id: 'inv-1',
        title: 'Lookalike vendor domain',
        events: [
          note(
            'Vendor Lumen Freight emailed new bank details; the reply-to domain lumen-freight.co differs from the real lumen-freight.com.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Wire approved',
        events: [
          note(
            'Accounts payable approved wire WIRE-55410 for 184,500 EUR to the new IBAN DE89 3704 0044 0532 0130 00.'
          ),
        ],
      },
      {
        id: 'inv-3',
        title: 'Funds traced',
        events: [
          note(
            'Final investigation: the receiving account was drained within 20 minutes to a crypto exchange deposit address bc1qexample7x9k2.'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: 'lumen-freight.co',
        text: 'The lookalike reply-to domain was lumen-freight.co.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: 'WIRE-55410',
        text: 'The fraudulent payment was wire WIRE-55410.',
        investigation: 1,
      },
      {
        id: 'f3',
        key: 'bc1qexample7x9k2',
        text: 'The funds ended at deposit address bc1qexample7x9k2 (last investigation only).',
        investigation: 2,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'Which lookalike domain did the fraudulent email come from?',
        answer: 'The reply-to domain lumen-freight.co.',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'What was the reference of the approved wire?',
        answer: 'Wire WIRE-55410 for 184,500 EUR.',
        factIds: ['f2'],
      },
      {
        id: 'q3',
        question: 'Where did the funds end up?',
        answer: 'At the crypto deposit address bc1qexample7x9k2.',
        factIds: ['f3'],
      },
    ],
  },
  {
    id: 'case-16-rogue-rmm',
    description:
      'Four investigations into an abused remote-management tool; the last shows it spread to other laptops.',
    investigations: [
      {
        id: 'inv-1',
        title: 'RMM client installed',
        events: [
          note(
            'ScreenConnect client installed on HR-LT-19 from an email link; relay host relay-sc.example-rmm.net.'
          ),
        ],
      },
      {
        id: 'inv-2',
        title: 'Payload download',
        events: [
          note(
            'The RMM session ran certutil -urlcache to fetch beacon.dll into C:\\ProgramData\\Intel.'
          ),
        ],
      },
      {
        id: 'inv-3',
        title: 'Persistence',
        events: [
          note(
            'Scheduled task IntelSync was created on HR-LT-19 to load the DLL hourly as SYSTEM.'
          ),
        ],
      },
      {
        id: 'inv-4',
        title: 'Spread to other laptops',
        events: [
          note(
            'Final investigation: the same relay was seen on 6 other laptops, the first being FIN-LT-02.'
          ),
        ],
      },
    ],
    plantedFacts: [
      {
        id: 'f1',
        key: 'relay-sc.example-rmm.net',
        text: 'The RMM relay host was relay-sc.example-rmm.net.',
        investigation: 0,
      },
      {
        id: 'f2',
        key: 'beacon.dll',
        text: 'The payload downloaded via certutil was beacon.dll.',
        investigation: 1,
      },
      {
        id: 'f3',
        key: 'IntelSync',
        text: 'Persistence was the scheduled task IntelSync.',
        investigation: 2,
      },
      {
        id: 'f4',
        key: 'FIN-LT-02',
        text: 'The first additional laptop with the relay was FIN-LT-02 (last investigation only).',
        investigation: 3,
      },
    ],
    questions: [
      {
        id: 'q1',
        question: 'Which relay host did the RMM client connect to?',
        answer: 'relay-sc.example-rmm.net.',
        factIds: ['f1'],
      },
      {
        id: 'q2',
        question: 'What was the name of the scheduled task used for persistence?',
        answer: 'The scheduled task IntelSync.',
        factIds: ['f3'],
      },
      {
        id: 'q3',
        question: 'Did the same relay show up on any other laptops? Which was first?',
        answer: 'Yes, on 6 other laptops, the first being FIN-LT-02.',
        factIds: ['f4'],
      },
    ],
  },
];

/**
 * Deterministic dataset checks: question facts must live in exactly one
 * investigation, and every case must have a fact unique to its LAST linked
 * investigation (the mutation target). Every investigation must host at least
 * one planted fact (no decoy investigations) and the last one must be asked
 * about, so a dropped last investigation removes a graded question. Exported for
 * the unit tests.
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
    for (const [index, inv] of c.investigations.entries()) {
      if (!c.plantedFacts.some((fact) => fact.investigation === index)) {
        issues.push({ caseId: c.id, problem: `investigation ${inv.id} hosts no planted fact` });
      }
    }
    const questionHomes = c.questions.flatMap((q) =>
      q.factIds.map((id) => c.plantedFacts.find((f) => f.id === id)?.investigation)
    );
    if (!questionHomes.includes(last)) {
      issues.push({ caseId: c.id, problem: 'no question on the last investigation' });
    }
    const keys = new Set(c.plantedFacts.map((f) => f.key));
    if (keys.size !== c.plantedFacts.length) {
      issues.push({ caseId: c.id, problem: 'duplicate planted fact keys' });
    }
    // Every fact key must actually appear in the events of its investigation.
    for (const fact of c.plantedFacts) {
      const events = c.investigations[fact.investigation];
      const haystack = events.events.map((e) => Object.values(e.data).join(' ')).join(' ');
      if (!containsToken(haystack, fact.key)) {
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
