---
title: "Analysis of Log4Shell vulnerability & CVE-2021-45046"
slug: "analysis-of-log4shell-cve-2021-45046"
date: "2022-11-30"
description: "In this post, we cover next steps the Elastic Security team is taking for users to continue to protect themselves against CVE-2021-44228, or Log4Shell."
author:
  - slug: jake-king
image: "photo-edited-12-e.jpg"
category:
  - slug: security-research
  - slug: vulnerability-updates
---

> _To understand how Elastic is currently assessing internal risk of this vulnerability in our products please see the advisory_[_here._](https://discuss.elastic.co/t/apache-log4j2-remote-code-execution-rce-vulnerability-cve-2021-44228-esa-2021-31/291476)
>
> _This document was updated on December 17, 2021 to reflect a revised CVSS score for CVE-2021-45046, and new findings by the community._

In recent days Log4Shell, or CVE-2021-44228, has dominated the news cycle in the world of information security and beyond. Elastic released an [advisory](https://discuss.elastic.co/t/apache-log4j2-remote-code-execution-rce-vulnerability-cve-2021-44228-esa-2021-31/291476?ultron=log4js-exploit&blade=announcement&hulk=email&mkt_tok=ODEzLU1BTS0zOTIAAAGBU8N1ZUOwzTcRbJCOiByHmeYiopMnarq-QPWBIyhPI3Vvsp6w-4q4PBbTGZ3fZ0sB75cpaUdOddA1k-6-yh3QwAicvJTgafdJWv_-9Cn2GoKLvsmt) detailing how Elastic products and users are impacted, and a [blog](https://www.elastic.co/blog/detecting-log4j2-with-elastic-security?ultron=log4js-exploit&blade=announcement&hulk=email&mkt_tok=ODEzLU1BTS0zOTIAAAGBU8N1ZDYRbFq2QZ4ZK8tc2IbDatArsdI6WGcA2M90g4v02svJeqCXFeZ23R4TjeYii4KBGAkqMBgWc5IkxYrmefgwZBanjGQh8v66drUymiVSQFvs) post describing how our users can leverage Elastic Security to help defend their networks.

Many readers have further questions as to how we’re tracking this issue within Elastic Security, what our coverage is now, and what we’re expecting to do next. This post outlines a few details for our current status, and provides details regarding a new, related vulnerability: CVE-2021-45046.

## Elastic Security response

As you may imagine, the team has worked tirelessly to ensure that we’re developing detections for both active exploitation of the vulnerability, as well as post-compromise indicators, and will continue active development until further notice.

We’re spending time focusing on detailed detections that better align with some of the emerging trends that adversaries are now taking advantage of as they have time to develop their attack strategies. And we’re not working in silence — those that may have had a chance to catch up on our [original post](https://www.elastic.co/blog/detecting-log4j2-with-elastic-security) a few days ago will be pleasantly surprised we’ve added further detections and hunting examples, and will continue to do so as we learn more with the community.

Alongside the threat research and signature development, we’ve noted some interesting observations:

- We noted several instances of [generic crypto miners](https://www.virustotal.com/gui/file/5b25db204b5cd5cc3193f4378dd270dced80da9d39874d8b6fdd75e97d2cc907/detection) for Linux being deployed that appeared to be related to exploitation of this CVE, but determined that they are benign true positives
- We’ve stopped at least eight different families of malware being deployed using the log4j exploit, indicating widespread adoption of the exploit by threats of all kinds
- While we are observing coverage across our full protection suite (such as behavior protection), it is noteworthy that our free basic-tier malware protection is successfully preventing initial access

We will aim to keep users and readers apprised of findings, and hope to share additional observations in the wild as we see them.

## A new contender: CVE-2021-45046

While we watch the CVE-2021-44228 (Log4Shell) vulnerability dominate the news cycles, a new contender, [CVE-2021-45046](https://nvd.nist.gov/vuln/detail/CVE-2021-45046), was accidentally introduced to Log4j2j version 2.15.0, allowing adversaries to invoke a Denial of Service, and a remote code execution condition through specially crafted payloads. Previous mitigations to avoid Information Disclosure vulnerabilities by setting the `log4j2.noFormatMsgLookup` state to `true` do not mitigate against this new finding, according to the CVE details.

While initially CVE-2021-45046 carried a lower CVSS score of 3.7 due to the impact of the initially discovered condition that can be invoked, this was re-evaluated to a 9.0 indicating limited remote code execution was possible. The finding was shared on December 16, 2021 by [Alvaro Muñoz](https://twitter.com/pwntester/status/1471465662975561734), who identified that while the default setting formatMsgNoLookups was accurately set to true, there were alternative locations for lookups to take place. Technical details are still unfolding from the community, however the Log4j2 team shared the following message within their security updates:

_The reason these measures are insufficient is that, in addition to the Thread Context attack vector mentioned above, there are still code paths in Log4j where message lookups could occur: known examples are applications that use Logger.printf("%s", userInput), or applications that use a custom message factory, where the resulting messages do not implement StringBuilderFormattable. There may be other attack vectors._

_The safest thing to do is to upgrade Log4j to a safe version, or remove the JndiLookup class from the log4j-core jar._ [_Reference here_](https://logging.apache.org/log4j/2.x/security.html)

Given this new information, and readily available[POCs](https://twitter.com/marcioalm/status/1471740771581652995) available for exploitation, the Apache team has recommended those impacted upgrade to the latest, safe version of Log4j2, or alternatively remove the JndiLookup class from the log4j-core jar.

Elastic Security has observed many threat actors and benign scanners leveraging this new methodology already in some edge environments, with payloads incorporating previous attack methodologies such as key extraction attempts and base64 encoded payloads:

![A preview of the rapid acceleration of scanning attempts adopting this new vulnerability](/assets/images/analysis-of-log4shell-cve-2021-45046/scanning-attempts-vulnerability.jpg)

We anticipate adding further details as we learn them, and thank the team at lunasec specifically for providing a [detailed, early summary](https://www.lunasec.io/docs/blog/log4j-zero-day-severity-of-cve-2021-45046-increased/) of this emerging situation, and of course, provide kudos to [Alvaro Muñoz](https://twitter.com/pwntester) of Github Security Lab for the findings.

## Thank you (again!), from Elastic Security

We want to thank all of the security teams across the globe for your tireless work this week. As we referenced before, openness and collaboration in the security community to safeguard all users is paramount when facing such a serious and pervasive vulnerability.

Existing Elastic Security users can access these capabilities within the product. If you’re new to Elastic Security, take a look at our [Quick Start guides](https://www.elastic.co/training/elastic-security-quick-start) (bite-sized training videos to get you started quickly) or our [free fundamentals training courses](https://www.elastic.co/training/free#fundamentals).

Get started with a [free 14-day trial of Elastic Cloud](https://cloud.elastic.co/registration). Or [download](https://www.elastic.co/downloads/) the self-managed version of the Elastic Stack for free.

### References

[https://logging.apache.org/log4j/2.x/security.html](https://logging.apache.org/log4j/2.x/security.html)

[https://www.lunasec.io/docs/blog/log4j-zero-day-severity-of-cve-2021-45046-increased/](https://www.lunasec.io/docs/blog/log4j-zero-day-severity-of-cve-2021-45046-increased/)
