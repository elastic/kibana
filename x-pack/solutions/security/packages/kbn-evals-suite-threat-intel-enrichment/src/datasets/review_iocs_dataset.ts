/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReviewIocsExample } from '../types';

/**
 * Plain-prose emails through the real extract and enrich routes.
 *
 * - Real text, model-decided, not hunted: publisher and vendor contact lines from public CISA
 *   documents (US government works, kept untrimmed around the address).
 * - Real text, rule-decided, not hunted: the Elastic Security Labs Zimbra article excerpts. The
 *   extractor settles these without the model, so only the absence of any other hunted email is
 *   scored here; the exact tiers are asserted in `extract_iocs.test.ts`.
 * - Authored, model-decided: attacker addresses that must be hunted, and researcher, victim and
 *   recipient addresses that must not.
 *
 * The merge bar is every evaluator at 1.0 on every repetition. A model that approves nothing fails
 * `email-hunted`; one that approves everything fails `email-not-hunted`.
 */

const COLD_CHAIN_URL =
  'https://www.cisa.gov/resources-tools/resources/us-government-partners-urge-hardening-industrial-refrigeration-and-cold-chain-monitoring-systems';

const ZIMBRA_EXCERPT = [
  'Sep 30 22:48:29 mail postfix/pickup[57597]: 6272F1E1393: uid=997 from=<zimbra>',
  'Sep 30 22:48:29 mail postfix/cleanup[57599]: 6272F1E1393: message-id=<20261001024829.6272F1E1393@mail.lab.test>',
  'Sep 30 22:48:29 mail postfix/qmgr[57598]: 6272F1E1393: from=<zimbra@mail.lab.test>, size=604, nrcpt=1 (queue active)',
  '',
  'A normal SMTP message includes a MAIL FROM section, denoting the sender, and a RCPT TO, specifying the recipient, along with DATA, which is the message. The first two require the email address to be wrapped in angle brackets; for example, <address@host.name>. If an attacker doesn’t follow the wrapping and omits the final >, the specified unclosed address will show up in the log file. For example, an address of <address@host.namewill have a log entry as follows:',
  '',
  '[>] MAIL FROM:<test@test.com>',
].join('\n');

export const reviewIocsDataset: ReviewIocsExample[] = [
  {
    input: {
      title:
        'US Government Partners Urge Hardening Industrial Refrigeration and Cold Chain Monitoring Systems',
      article_url: COLD_CHAIN_URL,
      text: [
        '## Contact Information',
        'The authoring organizations recommend U.S. organizations report suspicious or criminal activity related to information provided in this fact sheet:',
        '- Contact CISA via CISA’s 24/7 Operations Center at contact@cisa.dhs.gov or 1-844-Say-CISA (1-844-729-2472). For more information on reporting a cyber incident, refer to CISA’s Voluntary Cyber Incident Reporting web page. File a claim with FBI’s Internet Crime Complaint Center (IC3) or contact your local FBI field office. When available, please include the following information regarding the incident:',
        '- Type of activity;',
        '- Number of people affected;',
        '- Type of equipment used for the activity; and',
        '- Name of the submitting company or organization, and a designated point of contact.',
        '- Contact HHS via HHSCyber@hhs.gov or the HHS 24/7 Operations Center at 202-619-7800 for assistance mitigating potential disruptions to the delivery of healthcare resources.',
      ].join('\n'),
    },
    output: {
      emails: [
        { value: 'contact@cisa.dhs.gov', hunted: false, decidedBy: 'model' },
        { value: 'hhscyber@hhs.gov', hunted: false, decidedBy: 'model' },
      ],
    },
    metadata: {
      Title: 'review_iocs: CISA fact sheet contact lines (not hunted)',
      source: 'fixture-derived',
    },
  },
  {
    input: {
      title: 'Subnet Solutions PowerSYSTEM Center',
      article_url: 'https://www.cisa.gov/news-events/ics-advisories/icsa-26-307-01',
      text: [
        'Mitigation',
        "For users who are currently using PowerSYSTEM Center 2024, Subnet Solutions recommends users upgrade to PowerSYSTEM Center 2026 Update 1.1. For assistance in upgrading, users should contact the Subnet Solutions System Integration team or customer support team at (403) 270-8885 or by email at support@subnet.com. If unable to update to the latest version, Subnet Solutions recommends users monitor user activity records to ensure users are following acceptable usage policies of the application. Subnet Solutions also recommends disabling PowerSYSTEM Center Client Access Server users' ability to access the browser's F12 Developer Tools.",
      ].join('\n'),
    },
    output: {
      emails: [{ value: 'support@subnet.com', hunted: false, decidedBy: 'model' }],
    },
    metadata: {
      Title: 'review_iocs: ICS advisory vendor support address (not hunted)',
      source: 'fixture-derived',
    },
  },
  {
    input: {
      title: 'How CVE-2026-73570 turns a Zimbra log file into remote code execution',
      text: ZIMBRA_EXCERPT,
    },
    output: {
      emails: [
        { value: 'test@test.com', hunted: false, decidedBy: 'rule' },
        { value: 'zimbra@mail.lab.test', hunted: false, decidedBy: 'rule' },
        { value: 'address@host.name', hunted: false, decidedBy: 'rule' },
      ],
    },
    metadata: {
      Title: 'review_iocs: Zimbra log excerpts (rule-decided, not hunted)',
      source: 'fixture-derived',
    },
  },
  {
    input: {
      title: 'Invoice-themed phishing campaign targets finance teams',
      text:
        'The campaign began with a phishing wave against accounts-payable staff. The phishing sender was ' +
        'billing-update@invoice-portal-secure.com, which the operators used to deliver a malicious ' +
        'attachment named invoice_4471.iso. Victims who opened the attachment ran a loader that beaconed ' +
        'to attacker infrastructure.',
    },
    output: {
      emails: [
        { value: 'billing-update@invoice-portal-secure.com', hunted: true, decidedBy: 'model' },
      ],
    },
    metadata: { Title: 'review_iocs: phishing sender in prose (hunted)', source: 'authored' },
  },
  {
    input: {
      title: 'Credential-harvesting lure impersonates IT helpdesk',
      text:
        'The lure used a spoofed sender that mimicked the internal helpdesk. The raw message header from a ' +
        'quarantined sample is reproduced below.\n\n' +
        'From: "IT Helpdesk" <helpdesk-reset@corp-itsupport-login.com>\n' +
        'Subject: Password expires today\n' +
        'X-Mailer: PHPMailer 6.5\n\n' +
        'The message linked to a credential-harvesting page hosted by the same operators.',
    },
    output: {
      emails: [
        { value: 'helpdesk-reset@corp-itsupport-login.com', hunted: true, decidedBy: 'model' },
      ],
    },
    metadata: {
      Title: 'review_iocs: spoofed sender in a quoted header (hunted)',
      source: 'authored',
    },
  },
  {
    input: {
      title: 'New extortion group encrypts file servers',
      text:
        'After encrypting the file servers the operators left a ransom note in every directory. The ransom ' +
        'note instructs victims to write to decrypt-support@onionmail-recovery.net within 72 hours to ' +
        'negotiate payment, and warns that stolen data will be published if the deadline passes.',
    },
    output: {
      emails: [
        { value: 'decrypt-support@onionmail-recovery.net', hunted: true, decidedBy: 'model' },
      ],
    },
    metadata: { Title: 'review_iocs: ransom-note contact (hunted)', source: 'authored' },
  },
  {
    input: {
      title: 'Malicious package published to a public registry',
      text:
        'The operators registered the account deploy-bot@protonmail-relay.com with the package registry and ' +
        'used it to publish three typosquatted packages. The packages ran a post-install script that ' +
        'collected environment variables and sent them to a remote server.',
    },
    output: {
      emails: [{ value: 'deploy-bot@protonmail-relay.com', hunted: true, decidedBy: 'model' }],
    },
    metadata: { Title: 'review_iocs: attacker-registered account (hunted)', source: 'authored' },
  },
  {
    input: {
      title: 'Path traversal in a document management product',
      text:
        'We thank Priya Raman (priya.raman@securitylab-research.org) for reporting this vulnerability and ' +
        'coordinating disclosure with the vendor. The issue allows an authenticated user to read arbitrary ' +
        'files and is fixed in version 4.2.1.',
    },
    output: {
      emails: [
        { value: 'priya.raman@securitylab-research.org', hunted: false, decidedBy: 'model' },
      ],
    },
    metadata: { Title: 'review_iocs: researcher credit (not hunted)', source: 'authored' },
  },
  {
    input: {
      title: 'Executive impersonation fraud at a logistics firm',
      text:
        'The attacker targeted the chief financial officer, whose mailbox cfo@riverton-logistics.com received ' +
        'the first lure, and then used the stolen session to approve fraudulent wire transfers. The firm ' +
        'rotated the executive’s credentials after the incident.',
    },
    output: {
      emails: [{ value: 'cfo@riverton-logistics.com', hunted: false, decidedBy: 'model' }],
    },
    metadata: {
      Title: 'review_iocs: victim address in an attacker sentence (not hunted)',
      source: 'authored',
    },
  },
  {
    input: {
      title: 'Spearphishing wave against a regional hospital group',
      text:
        'The lure was addressed to: ap@riverton-hospital.org, payroll@riverton-hospital.org, and ' +
        'hr@riverton-hospital.org. None of the recipients opened the attachment, and the mail gateway ' +
        'quarantined the message.',
    },
    output: {
      emails: [
        { value: 'ap@riverton-hospital.org', hunted: false, decidedBy: 'model' },
        { value: 'payroll@riverton-hospital.org', hunted: false, decidedBy: 'model' },
        { value: 'hr@riverton-hospital.org', hunted: false, decidedBy: 'model' },
      ],
    },
    metadata: { Title: 'review_iocs: recipient list (not hunted)', source: 'authored' },
  },
  {
    input: {
      title: 'Business email compromise targets a software vendor customer',
      text:
        'The phishing sender was billing@invoice-portal-secure.com, an address registered by the operators a ' +
        'week before the campaign. Customers who received the message should delete it. To report a ' +
        'suspicious message to the vendor, contact the vendor security desk at support@riverton-vendor.com.',
    },
    output: {
      emails: [
        { value: 'billing@invoice-portal-secure.com', hunted: true, decidedBy: 'model' },
        { value: 'support@riverton-vendor.com', hunted: false, decidedBy: 'model' },
      ],
    },
    metadata: {
      Title: 'review_iocs: attacker address and vendor support address',
      source: 'authored',
    },
  },
];
