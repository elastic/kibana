---
title: "Accelerating Elastic detection tradecraft with LLMs"
slug: "accelerating-elastic-detection-tradecraft-with-llms"
date: "2023-09-29"
description: "Learn more about how Elastic Security Labs has been focused on accelerating our detection engineering workflows by tapping into more generative AI capabilities."
author:
  - slug: mika-ayenson
  - slug: jess-daubner
image: "photo-edited-09@2x.jpg"
category:
  - slug: detection-science
  - slug: machine-learning
  - slug: generative-ai
---

In line with our [Openness Initiative](https://www.elastic.co/blog/continued-leadership-in-open-and-transparent-security), we remain committed to transparency and want to share how our internal AI R&D efforts have increased the productivity of our threat detection team. For the past few months, Elastic Security Labs has been focused on accelerating our detection engineering workflows by tapping into more generative AI capabilities. 

## The ONWeek Exploration Odyssey

At Elastic, outside of our long-running [Space, Time](https://www.elastic.co/about/our-source-code) tradition, we dedicate a week every 6 months to work either independently or in a team on something we call ONWeek. This is a week where we all step away from feature work, tech debt, and other similar tasks; and use the week to focus on innovative ideas, active learning opportunities, applied research, and proof of concept work. During the previous ONWeek in May, we explored ideas to leverage large language models (LLMs) with Elastic’s existing features to enhance security alert triaging and productivity for tier 1 analysts and on, internal productivity workflows, and understanding the foundational building blocks for our experimentation and tuning. Figure 1 shows several different opportunities for research we have, which involve ingesting events, passing data through tailored prompts, and generating different classes of content designed for different Elastic workflows. 

![Figure 1: GenAI Security Use Cases](/assets/images/accelerating-elastic-detection-tradecraft-with-llms/image1.jpg)
Figure 1: GenAI Security Use Cases

Fundamentally we explored several traditional ML approaches, but ultimately focused on starting simple and gradually increasing complexity, while keeping in mind these tools and concepts:
 - **Start Simple** - A mantra that guided our approach.
 - **Azure OpenAI** -  Access to the GPT-4 LLM
 - **Prompt Engineering** - Developing tailored instructions for the LLM.
 - **LangChain** - Python library to help craft LLM applications.

One of our goals is to streamline Elastic’s detection engineer workflows, allowing for greater focus on better detections while showcasing the depth and nuances of our query languages. On the way there, we’re spending time experimenting to validate our prompts and prepare them for operational use. We want to make sure that as we iterate over our prompts, we don’t incidentally introduce regressions. As AI advancements emerge, we intend for our T&E to ensure that any adjustments, be it fine-tuning, model replacements, or prompt modifications, are deliberate. Ultimately, we aspire for our analysts to seamlessly utilize the latest AIML features, applying the most suitable prompts or ML techniques in the right context.

With these goals in mind, our first research use case in May focused on query generation. We learned quickly that with minimal data and prompt engineering, we could chain a series of prompts to transform raw Elastic events into EQL queries.  

![Figure 2: Query Generation POC](/assets/images/accelerating-elastic-detection-tradecraft-with-llms/image44.gif)
Figure 2: Query Generation POC

For experimentation purposes, we simulated suspicious activity using our [Red Team Automation (RTA)](https://github.com/elastic/detection-rules/tree/main/rta) scripts and captured the endpoint activity in the SIEM through the Elastic Agent.  Figure 2 displays sample events from the Elastic stack, exported to gold.json test files, that included the essential event fields for query generation. 

We then asked GPT to analyze the event collection covering the RTA execution time window and focus on events with suspicious behavior. In our POC, the prompt asked us to pinpoint key values linked to potential anomalies. We then followed with subsequent prompts to chunk the events and summarize all of the activity. Based on all the summaries, we asked GPT to generate a list of indicators, without keying on specific values. With this short list of suspicious behaviors, we then asked GPT to generate the query. A significant advantage of our long-term open-source development is that GPT-related models are familiar with Elastic content, and so we benefited by not having to overfit our prompts.

Even though going from raw data to an EQL query was conceptually straightforward, we still encountered minor hiccups like service availability with Azure OpenAI. It was relatively cheap, in what we estimated cost us around $160 in a week to use the OpenAI and Azure OpenAI inference and embedding APIs. We also explored using the GCP Vertex AI Workbench to facilitate collaborative work on Jupyter notebooks, but the complexity of using the available open source (OSS) models made them challenging to use during the short ONWeek.

![Figure 3: May 2023 ONWeek Major Outcomes](/assets/images/accelerating-elastic-detection-tradecraft-with-llms/image2.png)
Figure 3: May 2023 ONWeek Major Outcomes

We used ONWeek to mature our roadmap like expanding beyond in-memory, library-based vector search implementations to more performant, scalable, and production-ready data stores of our detection-rules content in Elasticsearch. Based on our initial results, we understood the potential and viability of integrating GenAI into the analyst workflow (e.g. allowing event time-window selection, query generation, and timeline addition). Based on these early wins, we put on our internal roadmap plans to pursue further LLM R&D and decided to tackle one of our internal productivity workflows.

## A New Horizon: Generating Investigation Guides

Over the years, Elastic Security Labs has matured its content. Starting in 2020 by adding the Investigation Guide Security feature, then standardizing those guides in 2021. By 2023, with over 900 [rules](https://github.com/elastic/detection-rules/tree/main/rules) in place, we are actively seeking an efficient way to generate highly accurate, detailed, and standardized guides for all 900+ pre-built rules.

Melding traditional ML approaches (like similarity vector search) with our prompt engineering special sauce, our team created a new prototype centered around investigation guide generation called Rulecraft. Now, with just a rule ID in hand, our rule authors can generate a baseline investigation guide solution in mere minutes! 

![Figure 4: Sample Investigation Guide](/assets/images/accelerating-elastic-detection-tradecraft-with-llms/image3.png)
Figure 4: Sample Investigation Guide

In this initial exploration, we supplied detection rules, but limited input to a few fields from the rules like the description and name of GPT. We also attempted to supply the query, but it appeared to overfit the expected outcome we desired. Initially, we provided a simple prompt with these fields to evaluate how well GPT could generate a decent investigation guide with minimal effort. As we explored further, it became evident that we could benefit from chaining multiple prompts akin to what we did during the EQL query generation experiment. So we spent time creating prompts tailored to distinct sections of the investigation guide. Segmenting the prompts not only granted us greater flexibility but also addressed areas where GPT faltered, such as the "Related Rules" section, where GPT tended to hallucinate most. At times like this, we used traditional ML methods like similarity search and integrated our rules into a vector database for enhanced context.

Next, we identified opportunities to inject additional context into specific sections. To ensure uniformity across our guides, we curated a library of approved content and language for each segment. This library then guided GPT in generating and formatting responses similar to our established standard messages. We then compared GenAI-produced guides with their manually crafted counterparts to identify other formatting discrepancies, general errors introduced by GPT, and even broader issues with our prompts. 

Based on these findings, we chose to improve our generated content by adjusting the prompts instead of using post-processing techniques like string formatting. While the automated investigation guides aren't perfect, they offer our detection engineers a solid starting place. In the past, investigation guides have enhanced our PR peer review process by providing the reviewer with more context as the rules expected behavior. We now can generate the base guide, tune it, and add more detail as needed by the detection engineer instead of starting from scratch.  

To bring this capability directly to our detection engineers, we integrated Rulecraft into a GitHub action workflow, so they can generate guides on-demand. We also produced the additional 650+ guides in a mere 13 hours—a task that would traditionally span months. The automation allows us to make small tweaks and quickly regenerate base content for rules missing investigation guides. Again, these guides are still subject to our stringent internal review, but the time and effort saved by leveraging GenAI for our preliminary drafts is incredible. 

## Charting the Future: Next Steps 

Our research and development journey continues, with a central focus on refining our approach to content generation with LLMs and more thoroughly validating our results. Here’s a short list of our priorities now that we’ve explored the viability and efficacy of integrating LLMs into our detection engineering workflow: 
 - Compare proprietary models with the latest open-source models
 - Further refine our experimentation process including event filtering, prompt optimization, and exploring various model parameters
 - Create a test suite to validate our results and prevent regressions.
 - Seamlessly integrate our R&D advancements into the [Elastic AI Assistant](https://www.elastic.co/blog/open-security-impact-elastic-ai-assistant).

Overall, we want to dramatically increase our investigation guide coverage and reduce the time taken to craft these guides from the ground up. Each investigation guide provides analysts with detailed, step-by-step instructions and queries for triaging alerts. With a customer-first mentality at the forefront of our [source code](https://www.elastic.co/about/our-source-code), we aim to elevate the analyst experience with more investigation guides of even higher quality, translating into less time spent by our customers on FP analysis and alert triaging.

## Summary
Keeping in spirit with our open innovation and transparency, Elastic Security Labs has begun our generative AI voyage to enhance the productivity of our threat detection processes. Our efforts continue to evolve and incorporate prompt engineering and traditional ML approaches on a case-by-case basis, resulting in more R&D proof-of-concepts like “LetmeaskGPT” and "Rulecraft". The latter POC has significantly reduced the time required to craft baseline guides, improve the analyst experience, and reduce false positive analyses. There’s so much more to do and we want to include you on our journey! While we've made strides, our next steps include further refinement, developing a framework to rigorously validate our results, and exploring opportunities to operationalize our R&D, ensuring we remain at the forefront of security advancements. 

We’re always interested in hearing use cases and workflows like these, so as always, reach out to us via [GitHub issues](https://github.com/elastic/detection-rules/issues), chat with us in our [community Slack](http://ela.st/slack), and ask questions in our [Discuss forums](https://discuss.elastic.co/c/security/endpoint-security/80)!

Also, feel free to check out these additional resources to learn more about how we’re bringing the latest AI capabilities to the hands of the analyst: 
 - Learn how to responsibly use [ChatGPT with Elasticsearch](https://www.elastic.co/blog/chatgpt-elasticsearch-openai-meets-private-data)
 - See the new Elastic [AI Assistant](https://www.elastic.co/blog/introducing-elastic-ai-assistant) — the open, generative AI sidekick powered by ESRE and [get setup](https://www.elastic.co/guide/en/security/current/security-assistant.html#set-up-ai-assistant)
