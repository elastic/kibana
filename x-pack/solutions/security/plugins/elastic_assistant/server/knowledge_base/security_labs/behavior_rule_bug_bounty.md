---
title: "Announcing the Elastic Bounty Program for Behavior Rule Protections"
slug: "behavior-rule-bug-bounty"
date: "2025-01-29"
subtitle: "Introducing a new focus on behavior rule protections, empowering researchers to enhance Elastic Security through innovative detection rule testing."
description: "Elastic is launching an expansion of its security bounty program, inviting researchers to test its SIEM and EDR rules for evasion and bypass techniques, starting with Windows endpoints. This initiative strengthens collaboration with the security community, ensuring Elastic’s defenses remain robust against evolving threats."
author:
  - slug: mika-ayenson
  - slug: samir-bousseaden
  - slug: rodrigo-silva
  - slug: jake-king
image: "behavior-rule-bug-bounty.jpg"
category:
  - slug: security-research
  - slug: security-operations
  - slug: vulnerability-updates
tags:
  - bug-bounty
  - vulnerability
---

## Introduction

We’re excited to introduce a new chapter in [our security bounty program](https://hackerone.com/elastic?type=team) on HackerOne that we soft launched in December 2024. Elastic is now offering a unique opportunity for researchers to test our [detection](https://github.com/elastic/detection-rules) rules (SIEM) and [endpoint](https://github.com/elastic/protections-artifacts/tree/main/behavior) rules (EDR), helping to identify gaps, vulnerabilities, and areas for improvement. This program builds on the success of our existing collaboration with the security research community, with a fresh focus on external validation for SIEM and EDR rule protections, which are provided as prebuilt content for [Elastic Security](https://www.elastic.co/security) and deeply connected to the threat research published on [Elastic Security Labs](https://www.elastic.co/security-labs).  

At Elastic, [openness](https://www.elastic.co/blog/continued-leadership-in-open-and-transparent-security) has always been at the core of our philosophy. We prioritize being transparent about *how* we protect our users. Our protections for SIEM and EDR are not hidden behind a curtain or paywall. Anyone can examine and provide immediate feedback on our protections. This feedback pipeline has proven to be a powerful enabler to refine and improve, while fostering collaboration with security professionals worldwide. 

While we have performed various forms of testing internally over the years, some of which still exist today — such as emulations via internal automation capabilities, unit tests, evaluations, smoke tests, peer review processes, pen tests, and participating in exercises like [Locked Shields](https://www.elastic.co/blog/nation-states-cyber-threats-locked-shields), we want to take it one step further. By inviting the global security community to test our rules, we plan to push the maturity of our detection capabilities forward and ensure they remain resilient against evolving adversary techniques.

## Elastic’s security bug bounty program offering 

Elastic maintains a mature and proactive public bug bounty program, launched in 2017 which has paid out over $600,000 in awards since then. We value our continued partnership with the security research community to maintain the effectiveness of these artifacts, shared with the community to identify known and newly-discovered threats. 

The scope of our bounty has included Elastic’s development supply chain, [Elastic Cloud](https://www.elastic.co/cloud), [the Elastic Stack](https://www.elastic.co/elastic-stack), our product solutions, and our corporate infrastructure. This initiative provides researchers with additional guided challenges and bonus structures that will contribute directly to hardening our security detection solutions.  

## A new bounty focus: Elastic Security rule assessments

This latest offering marks an exciting shift by expanding the scope of our bounty program to specifically focus on detection rulesets for the first time. While bounties have traditionally targeted vulnerabilities in products and platforms, this program invites the community to explore new ground: testing for evasion and bypass techniques that affect our rules.

By initially targeting rules for Windows endpoints, this initiative creates an opportunity for the security community to showcase creative ways of evading our defenses. The focus areas for this period include key [MITRE ATT&CK techniques](https://attack.mitre.org/).

### Why this is important

Elastic has consistently collaborated with our community, particularly through our community Slack, where members regularly provide feedback on our detection rules. This new bounty program doesn’t overshadow the incredible contributions already made: it adds another layer of involvement, offering a structured way to reward those who have dedicated time and effort to help us and our community defend against threats of all kinds.

By expanding our program to include detection rulesets, we’re offering researchers the chance to engage in a way that has a direct impact on our defenses. We demonstrate our belief in continuous improvement, ensuring we stay ahead of adversaries, and lead the industry in creative, yet exciting ways.

## Summary scope and rewards

For this initial offering, the bounty scope focuses on evasion techniques related to our detection (SIEM) and endpoint (EDR) rulesets, particularly for Windows. We are interested in submissions that focus on areas like:

* **Privilege evasion:** Techniques that bypass detection without requiring elevated privileges
* **MITRE ATT&CK technique evasion:** Creative bypasses of detection rules for specific techniques such as process injection, credential dumping, creative initial/execution access, lateral movement, and others

Submissions will be evaluated based on their impact and complexity. Over time, we plan the scope will evolve so watch out for future announcements and the Hackerone offering. 

For a full list of techniques and detailed submission guidelines, view current offering.

#### Time bounds

For this bounty incubation period (Jan 28th 2025 - May 1  2025), the scope will be *Windows Behavior Alerts*. 

## Current offering

### Behavior detections

Elastic invites the security community to contribute to the continuous improvement of our detection (SIEM) and endpoint (EDR) rulesets. Our mission is to enhance the effectiveness and coverage of these rulesets, ensuring they remain resilient against the latest threats and sophisticated techniques. We encourage hackers to identify gaps, bypasses, or vulnerabilities in specific areas of our rulesets as defined in the scope below.

#### What we’re looking for

We are particularly interested in submissions that focus on:

* **Privileges**: Priority is given to bypass and evasion techniques that do not require elevated privileges.
* **Techniques Evasion**: If a submission bypasses a single behavior detection but still triggers alerts, then it is not considered as a full bypass. 

Submissions will be evaluated based on their impact and complexity. The reward tiers are structured as follows:

* **Low**: Alerts generated are only low severity
* **Medium**: No alerts generated (SIEM or Endpoint)
* **High**: —
* **Critical**: —

#### Rule definition

To ensure that submissions are aligned with our priorities, each offering under this category will be scoped to a specific domain, MITRE tactic, or area of interest. This helps us focus on the most critical areas while preventing overly broad submissions.

General examples of specific scopes offered at specific times might include:

* **Endpoint Rules:** Testing for bypasses or privilege escalation rules within macOS, Linux, Windows platforms.
* **Cloud Rules:** Assessing the detection capabilities against identity-based attacks within AWS, Azure, GCP environments.
* **SaaS Platform Rules:** Validating the detection of OAuth token misuse or API abuse in popular SaaS applications.

#### Submission guidelines

To be eligible for a bounty, submissions must:

1. **Align with the Defined Scope:** Submissions should strictly adhere to the specific domain, tactic, or area of interest as outlined in the bounty offering.
2. **Provide Reproducible Results:** Include detailed, step-by-step instructions for reproducing the issue.
3. **Demonstrate Significant Impact:** Show how the identified gap or bypass could lead to security risks while not triggering any SIEM or EDR rules within the scope of the **Feature Details**.
4. **Include Comprehensive Documentation:** Provide all necessary code, scripts, or configurations used in the testing process to ensure the issue can be independently validated. The submission includes logs, screenshots, or other evidence showing that the attack successfully bypassed specific rules without triggering alerts, providing clear proof of the issue.

#### Feature details scope

For this offering, here are additional details to further scope down submissions for this period:

* **Target:** *Windows Behavior Alerts*
* **Scenario**
    * Goal: Gain execution of an arbitrary attacker delivered executable on a system protected by Elastic Defend without triggering any alerts
    * Story: User downloads a single non-executable file from their web browser and opens it. They may click through any security warnings that are displayed by the operating system
    * Extensions in scope: lnk, js, jse, wsf, wsh, msc, vbs, vbe, chm, psc1, rdp
    * Entire scenario must occur within 5 minutes, but a reboot is allowed
* **Relevant MITRE Techniques:** 
    * [Process Injection, Technique T1055 - Enterprise | MITRE ATT&CK®](https://attack.mitre.org/techniques/T1055) into Windows processes 
    * Lateral Movement via [Remote Services, Technique T1021 - Enterprise | MITRE ATT&CK®](https://attack.mitre.org/techniques/T1021) and credentials
    * [Phishing: Spearphishing Attachment, Sub-technique T1566.001 - Enterprise | MITRE ATT&CK®](https://attack.mitre.org/techniques/T1566/001/) (macro enabled docs, script, shortcuts etc.)
    * [Impair Defenses: Disable or Modify Tools, Sub-technique T1562.001 - Enterprise | MITRE ATT&CK®](https://attack.mitre.org/techniques/T1562/001/) (tampering with agents without administrative privileges techniques or techniques related to tampering with Elastic agent, PPL bypass, BYOVD etc.) 
* **Additional Success Criteria:** 
    * Ideally the bypasses can be combined in one chain (e.g. one payload performing multiple techniques and bypassing multiple existing rules scoped for the same techniques) - to avoid bypasses based solely on our public FP exclusions.
    * For phishing-based initial access techniques, submissions must clearly specify the delivery method, including how the target receives and interacts with the payload (e.g., email attachment, direct download, or cloud file sharing).
* **Additional Exclusions:**

Here are some examples of non-acceptable submissions, but not limited to:

* Techniques that rely on small x-process WriteProcessMemory
* Techniques that rely on sleeps or other timing evasion methods
* Techniques that rely on kernel mode attacks and require administrative privileges
* Techniques that rely on [Phishing, Technique T1566 - Enterprise | MITRE ATT&CK®](https://attack.mitre.org/techniques/T1566/) that are user assisted beyond initial access (e.g. beyond 2 or more user clicks) 
* Techniques that rely on well-documented information already in public repositories or widely recognized within the security community without any novel evasion or modification.
* Techniques that rely on legacy / unpatched systems
* Techniques that rely on highly specific environmental conditions or external factors that are unlikely to occur in realistic deployment scenarios 
* Techniques that rely on rule exceptions
* Techniques that require local administrator.
* Code injection techniques that rely on small payload size (less than 10K bytes)
* Techniques that rely on less than 10,000 bytes written at a time through a cross process WriteProcessMemory

#### Questions and disclosure

Please view our [Security Issues](https://www.elastic.co/community/security) page for any questions or concerns related to this offering.

## How to get involved

To participate and learn more, head over to[ HackerOne](https://hackerone.com/elastic) for complete details on the bounty program, submission guidelines, and reward tiers. We look forward to seeing the contributions from the research community and using these findings to continuously enhance the Elastic Security rulesets. Sign up for a [free cloud trial](https://www.elastic.co/cloud/cloud-trial-overview) to access Elastic Security!

*The release and timing of any features or functionality described in this post remain at Elastic's sole discretion. Any features or functionality not currently available may not be delivered on time or at all.*
