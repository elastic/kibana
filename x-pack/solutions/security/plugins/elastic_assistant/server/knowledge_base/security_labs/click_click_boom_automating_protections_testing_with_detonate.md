---
title: "Click, Click… Boom! Automating Protections Testing with Detonate"
slug: "click-click-boom-automating-protections-testing-with-detonate"
date: "2023-05-04"
description: "To automate this process and test our protections at scale, we built Detonate, a system that is used by security research engineers to measure the efficacy of our Elastic Security solution in an automated fashion."
author:
  - slug: jessica-david
  - slug: hez-carty
  - slug: sergey-polzunov
image: "blog-thumb-tools-various.jpg"
category:
  - slug: tools
  - slug: security-research
  - slug: detection-science
tags:
  - detonate
---

## Preamble

Imagine you are an Endpoint artifact developer. After you put in the work to ensure protection against conventional shellcode injections or ransomware innovations, how do you know it actually works before you send it out into the world?

First, you set up your end-to-end system, which involves setting up several services, the infrastructure, network configuration, and more. Then, you run some malware; the data you collect answers questions about performance and efficacy, and may be an important research resource in the future. After you spend a day testing and gathering your results, you may want to run several hundred hashes over multiple kinds of operating systems and machine types, a daunting task if done entirely manually.

To automate this process and test our protections at scale, we built Detonate, a system that is used by security research engineers to measure the efficacy of our Elastic Security solution in an automated fashion. Our goal is to have it take security researchers only a couple of clicks to test our protections against malware. (Thus: click, click… boom!)

In this series of posts, we’ll: - Introduce Detonate and why we built it - Explore how Detonate works and the technical implementation details - Describe case studies on how our teams use it at Elastic - Discuss opening our efficacy testing to the community to help the world protect their data from attack

Interested in other posts on Detonate? Check out [Part 2 - Into The Weeds: How We Run Detonate](https://www.elastic.co/security-labs/into-the-weeds-how-we-run-detonate) where we break down how Detonate works and dive deeper into the technical implementation.

## What is Detonate?

At a high level, Detonate runs malware and other potentially malicious software in a controlled (i.e., sandboxed) environment where the full suite of Elastic Security capabilities are enabled. Detonate accepts a file hash (usually a SHA256) and performs the following actions:

- Prepares all files needed for detonation, including the malicious file
- Provisions a virtual machine (VM) instance in a sandboxed environment, with limited connectivity to the outside world
- Waits until file execution completes; this happens when, for example, an execution result file is found or the VM instance is stopped or older than a task timeout
- Stops the running VM instance (if necessary) and cleans up the sandboxed environment
- Generates an event summary based on telemetry and alerts produced during detonation

The results of these detonations are made available to the team for research and development purposes. By post-processing the logs, events, and alerts collected during detonation, we can enrich them with third-party intelligence and other sources to evaluate the efficacy of new and existing Elastic Security protection features.

## What does it help us with?

### Measuring Efficacy

To build the best EPP on the market, we have to continuously measure the effectiveness of our product against the latest threats. Detonate is used to execute many tens of thousands of samples every month from our data feeds. Gaps in coverage are automatically identified and used to prioritize improvements to our protections.

### Supporting existing protections

Many of our protections have associated artifacts (such as machine learning models and rule definitions) which receive regular updates. These updates need testing to ensure we identify and remediate regressions before they end up in a user’s environment.

Detonate provides a framework and suite of tools to automate the analysis involved in this testing process. By leveraging a corpus of hashes with known good and bad software, we can validate our protections before they are deployed to users.

### Threat research

Some of our security researchers scour the internet daily for new and emerging threats. By giving them an easy-to-use platform to test malicious software they find in the wild, we better understand how Elastic Security defends against those threats or if we need to update our protections.

### Evaluating new protections

In addition to testing existing protections, new protections run the risk of adverse interactions with our existing suite of layered capabilities. A new protection may be easily tested on its own, but tests may hide unintended interactions or conflicts with existing protections. Detonate provides a way for us to customize the configuration of the Elastic Stack and individual protections to more easily find and identify such conflicts earlier in development.

## What’s next?

In this publication, we introduced Detonate & what we use it for at Elastic. We discussed the benefits it provides our team when assessing the performance of our security artifacts.

Now that you know what it is, we will break down how Detonate works. In our next post, we’ll dive deeper into the technical implementation of Detonate and how we’re able to create this sandboxed environment in practice.
