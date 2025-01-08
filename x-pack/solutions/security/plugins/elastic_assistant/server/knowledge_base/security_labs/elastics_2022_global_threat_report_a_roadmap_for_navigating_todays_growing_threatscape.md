---
title: "Elastic’s 2022 Global Threat Report: A roadmap for navigating today’s growing threatscape"
slug: "elastics-2022-global-threat-report-a-roadmap-for-navigating-todays-growing-threatscape"
date: "2022-12-08"
description: "Threat intelligence resources like the 2022 Elastic Global Threat Report are critical to helping teams evaluate their organizational visibility, capabilities, and expertise in identifying and preventing cybersecurity threats."
author:
  - slug: mandy-andress
image: "gtr-blog-image-720x420.jpg"
category:
  - slug: reports
---

Staying up-to-date on the current state of security and understanding the implications of today’s growing threat landscape is critical to my role as CISO at Elastic. Part of this includes closely following the latest security threat reports, highlighting trends, and offering valuable insights into methods bad actors use to compromise environments.

Threat intelligence resources like the [2022 Elastic Global Threat Report](https://www.elastic.co/explore/security-without-limits/global-threat-report) are critical to helping my team evaluate our organization’s visibility, capabilities, and expertise in identifying and preventing cybersecurity threats. It helps us answer questions such as:

- How is our environment impacted by the current and emerging threats identified in this report?
- Does this new information change our risk profile and impact our risk analysis?
- What adjustments do we need to make to our controls?
- Are we lacking visibility in any areas?
- Do we have the right detections in place?
- How might these insights affect my team’s workflows?

Elastic’s threat report provides a real-world roadmap to help my team make the connections necessary to strengthen our security posture. It influences our overall program roadmaps, helping us prioritize where we focus our resources, including adjusting our defenses, testing incident response plans, and identifying updates for our security operations center (SOC). And perhaps most importantly, the report underscores our belief that providing open, transparent, and accessible security for all organizations is key to defending ourselves against cybersecurity threats.

## Check your cloud security, and then check it again

Threat reports often reinforce many of the existing trends and phenomena we see within security, but they can also reveal some unexpected insights. While the cloud enables organizations to operate faster and at scale, it also creates security gaps that leave room for potential attacks as threat actors continue shifting their focus to the cloud.

The Elastic Global Threat Report revealed that nearly 40% of all malware infections are on Linux endpoints, further emphasizing the need for better cloud security. With [nine out of the top ten public clouds running on Linux](https://www.redhat.com/en/resources/state-of-linux-public-cloud-solutions-ebook), this statistic is an important reminder to organizations not to rely solely on their cloud provider’s standard configurations for security.

The findings further revealed that approximately 57% of cloud security events were attributed to AWS, followed by 22% for Google Cloud and 21% for Azure, and that 1 out of every 3 (33%) cloud alerts was related to credential access across all cloud service providers.

While the data points to an increased need for organizations to properly secure their cloud environments, it also reinforces our belief that cloud security posture management (CSPM) needs to evolve similarly to endpoint security.

Initially, endpoint security relied on simple antivirus, which was only as good as its antivirus signatures. To avoid increasingly sophisticated malware and threats, endpoint security evolved by employing more advanced technologies like next-gen antivirus with machine learning and artificial intelligence. CSPM is currently facing a similar situation. Right now, we are closer to the bottom of the cloud security learning curve than the top, and our technologies and strategies must continue to evolve to manage new and emerging threats.

The Elastic Global Threat Report demonstrates that native tools and traditional security tactics are ineffective when implemented in cloud environments and offers recommendations for how organizations can adapt to the evolving threat landscape.

## Get the basics right first

Security leaders and teams should leverage insights from this report to inform their priorities and adjust their workflows accordingly.

The findings clearly show why focusing on and improving basic security hygiene is so crucial to improved security outcomes. Too often, an organization’s environment is compromised by something as simple as a weak password or failure to update default configurations. Prioritizing security fundamentals — identity and access management, patching, threat modeling, password awareness, and multi-factor authentication — is a simple yet effective way for security teams to prevent and protect against potential threats.

## Develop security in the open

Organizations should consider adopting an open approach to security. For example, Elastic’s threat report links to our recent publication of [protection artifacts](https://github.com/elastic/protections-artifacts), which transparently shares endpoint behavioral logic that we develop at Elastic to identify adversary tradecraft and make it freely available to our community.

The report also highlights how Elastic Security’s [prebuilt detection rules](https://github.com/elastic/detection-rules/tree/main/rules) map to the MITRE ATT&CK matrix for each cloud service provider. As an adopter of the MITRE framework since its inception, Elastic understands the importance of mapping detection rules to an industry standard. For my team, this helps us have deeper insights into the breadth and depth of our security posture.

Providing open detection rules, open artifacts, and open code enables organizations to focus on addressing gaps in their security technology stack and developing risk profiles for new and emerging threats. Without openness and transparency in security, organizations are putting themselves at greater risk of tomorrow’s cybersecurity threats.

Download the [2022 Elastic Global Threat Report](https://www.elastic.co/explore/security-without-limits/global-threat-report).
