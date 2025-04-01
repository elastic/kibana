---
title: "Elastic Advances LLM Security with Standardized Fields and Integrations"
slug: "elastic-advances-llm-security"
date: "2024-05-06"
subtitle: "Explore How Elastic's New LLM Security Strategies Enhance Detection, Standardization, and Protection Across the LLM Ecosystem"
description: "Discover Elastic’s latest advancements in LLM security, focusing on standardized field integrations and enhanced detection capabilities. Learn how adopting these standards can safeguard your systems."
author:
  - slug: mika-ayenson
  - slug: dan-kortschak
  - slug: jake-king
  - slug: susan-chang
  - slug: andrew-kroh
image: "Security Labs Images 4.jpg"
category:
  - slug: detection-science
  - slug: machine-learning
  - slug: generative-ai
---

## Introduction

Last week, security researcher Mika Ayenson [authored a publication](https://www.elastic.co/security-labs/embedding-security-in-llm-workflows) highlighting potential detection strategies and an LLM content auditing prototype solution via a proxy implemented during Elastic’s OnWeek event series. This post highlighted the importance of research pertaining to the safety of LLM technology implemented in different environments, and the research focus we’ve taken at Elastic Security Labs.

Given Elastic's unique vantage point leveraging LLM technology in our platform to power capabilities such as the Security [AI Assistant](https://www.elastic.co/guide/en/security/current/security-assistant.html), our desire for more formal detection rules, integrations, and research content has been growing. This publication highlights some of the recent advancements we’ve made in LLM integrations, our thoughts around detections aligned with industry standards, and ECS field mappings.

We are committed to a comprehensive security strategy that protects not just the direct user-based LLM interactions but also the broader ecosystem surrounding them. This approach involves layers of security detection engineering opportunities to address not only the LLM requests/responses but also the underlying systems and integrations used by the models.

These detection opportunities collectively help to secure the LLM ecosystem and can be broadly grouped into five categories:

 1. **Prompt and Response**: Detection mechanisms designed to identify and mitigate threats based on the growing variety of LLM interactions to ensure that all communications are securely audited.
 2. **Infrastructure and Platform**: Implementing detections to protect the infrastructure hosting LLMs (including wearable AI Pin devices), including detecting threats against the data stored, processing activities, and server communication.
 3. **API and Integrations**: Detecting threats when interacting with LLM APIs and protecting integrations with other applications that ingest model output.
 4. **Operational Processes and Data**: Monitoring operational processes (including in AI agents) and data flows while protecting data throughout its lifecycle.
 5. **Compliance and Ethical**: Aligning detection strategies with well-adopted industry regulations and ethical standards. 

![Securing the LLM Ecosystem: five categories](/assets/images/elastic-advances-llm-security/image4.png)
Securing the LLM Ecosystem: five categories

Another important consideration for these categories expands into who can best address risks or who is responsible for each category of risk pertaining to LLM systems. 

Similar to existing [Shared Security Responsibility](https://www.cisecurity.org/insights/blog/shared-responsibility-cloud-security-what-you-need-to-know) models, Elastic has assessed four broad categories, which will eventually be expanded upon further as we continue our research into detection engineering strategies and integrations. Broadly, this publication considers security protections that involve the following responsibility owners:

 - **LLM Creators**: Organizations who are building, designing, hosting, and training LLMs, such as OpenAI, Amazon Web Services, or Google
 - **LLM Integrators**: Organizations and individuals who integrate existing LLM technologies produced by LLM Creators into other applications
 - **LLM Maintainers**: Individuals who monitor operational LLMs for performance, reliability, security, and integrity use-cases and remain directly involved in the maintenance of the codebase, infrastructure, and software architecture
 - **Security Users**: People who are actively looking for vulnerabilities in systems through traditional testing mechanisms and means. This may expand beyond the traditional risks discussed in [OWASP’s LLM Top 10](https://llmtop10.com/) into risks associated with software and infrastructure surrounding these systems

This broader perspective showcases a unified approach to LLM detection engineering that begins with ingesting data using native Elastic [integrations](https://www.elastic.co/integrations); in this example, we highlight the AWS Bedrock Model Invocation use case. 

## Integrating LLM logs into Elastic

Elastic integrations simplify data ingestion into Elastic from various sources, ultimately enhancing our security solution. These integrations are managed through Fleet in Kibana, allowing users to easily deploy and manage data within the Elastic Agent. Users can quickly adapt Elastic to new data sources by selecting and configuring integrations through Fleet. For more details, see Elastic’s [blog](https://www.elastic.co/blog/elastic-agent-and-fleet-make-it-easier-to-integrate-your-systems-with-elastic) on making it easier to integrate your systems with Elastic.

The initial ONWeek work undertaken by the team involved a simple proxy solution that extracted fields from interactions with the Elastic Security AI Assistant. This prototype was deployed alongside the Elastic Stack and consumed data from a vendor solution that lacked security auditing capabilities. While this initial implementation proved conceptually interesting, it prompted the team to invest time in assessing existing Elastic integrations from one of our cloud provider partners, [Amazon Web Services](https://docs.elastic.co/integrations/aws). This methodology guarantees streamlined accessibility for our users, offering seamless, one-click integrations for data ingestion. All ingest pipelines conform to ECS/OTel normalization standards, encompassing comprehensive content, including dashboards, within a unified package. Furthermore, this strategy positions us to leverage additional existing integrations, such as Azure and GCP, for future LLM-focused integrations.

### Vendor selection and API capabilities

When selecting which LLM providers to create integrations for, we looked at the types of fields we need to ingest for our security use cases. For the starting set of rules detailed here, we needed information such as timestamps and token counts; we found that vendors such as Azure OpenAI provided content moderation filtering on the prompts and generated content. LangSmith (part of the LangChain tooling) was also a top contender, as the data contains the type of vendor used (e.g., OpenAI, Bedrock, etc.) and all the respective metadata. However, this required that the user also have LangSmith set up. For this implementation, we decided to go with first-party supported logs from a vendor that provides LLMs. 

As we went deeper into potential integrations, we decided to land with AWS Bedrock, for a few specific reasons. Firstly, Bedrock logging has [first-party support](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html) to Amazon CloudWatch Logs and Amazon S3. Secondly, the logging is built specifically for model invocation, including data specific to LLMs (as opposed to other operations and machine learning models), including prompts and responses, and guardrail/content filtering. Thirdly, Elastic already has a [robust catalog](https://www.elastic.co/integrations/data-integrations?solution=all-solutions&category=aws) of integrations with AWS, so we were able to quickly create a new integration for AWS Bedrock model invocation logs specifically. The next section will dive into this new integration, which you can use to capture your Bedrock model invocation logs in the Elastic stack.

### Elastic AWS Bedrock model integration

#### Overview

The new Elastic [AWS Bedrock](https://docs.elastic.co/integrations/aws_bedrock) integration for model invocation logs provides a way to collect and analyze data from AWS services quickly, specifically focusing on the model. This integration provides two primary methods for log collection: Amazon S3 buckets and Amazon CloudWatch. Each method is optimized to offer robust data retrieval capabilities while considering cost-effectiveness and performance efficiency. We use these LLM-specific fields collected for detection engineering purposes.

Note: While this integration does not cover every proposed field, it does standardize existing AWS Bedrock fields into the gen_ai category. This approach makes it easier to maintain detection rules across various data sources, minimizing the need for separate rules for each LLM vendor.

### Configuring integration data collection method

#### Collecting logs from S3 buckets

This integration allows for efficient log collection from S3 buckets using two distinct methods:

 - **SQS Notification**: This is the preferred method for collecting. It involves reading S3 notification events from an AWS Simple Queue Service (SQS) queue. This method is less costly and provides better performance compared to direct polling. 
 - **Direct S3 Bucket Polling**: This method directly polls a list of S3 objects within an S3 bucket and is recommended only when SQS notifications cannot be configured. This approach is more resource-intensive, but it provides an alternative when SQS is not feasible.

#### Collecting logs from CloudWatch

Logs can also be collected directly from CloudWatch, where the integration taps into all log streams within a specified log group using the filterLogEvents AWS API. This method is an alternative to using S3 buckets altogether. 

#### Integration installation

The integration can be set up within the Elastic Agent by following normal Elastic [installation steps](https://www.elastic.co/guide/en/fleet/current/add-integration-to-policy.html). 

 1. Navigate to the AWS Bedrock integration
 2. Configure the ```queue_url``` for SQS or ```bucket_arn``` for direct S3 polling.

![New AWS Bedrock Elastic Integration](/assets/images/elastic-advances-llm-security/image2.png)

### Configuring Bedrock Guardrails

AWS Bedrock [Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html) enable organizations to enforce security by setting policies that limit harmful or undesirable content in LLM interactions. These guardrails can be customized to include denied topics to block specific subjects and content filters to moderate the severity of content in prompts and responses. Additionally, word and sensitive information filters block profanity and mask personally identifiable information (PII), ensuring interactions comply with privacy and ethical standards. This feature helps control the content generated and consumed by LLMs and, ideally, reduces the risk associated with malicious prompts.

Note: other guardrail examples include Azure OpenAI’s [content and response](https://learn.microsoft.com/en-us/azure/ai-services/openai/concepts/content-filter?tabs=warning%2Cpython-new) filters, which we aim to capture in our proposed LLM standardized fields for vendor-agnostic logging. 

![AWS Bedrock Guardrails](/assets/images/elastic-advances-llm-security/image1.png)

When LLM interaction content triggers these filters, the response objects are populated with ```amazon-bedrock-trace``` and ```amazon-bedrock-guardrailAction``` fields, providing details about the Guardrails outcome, and nested fields indicating whether the input matched the content filter. This response object enrichment with detailed filter outcomes improves the overall data quality, which becomes particularly effective when these nested fields are aligned with ECS mappings.

### The importance of ECS mappings

Field mapping is a critical part of the process for integration development, primarily to improve our ability to write broadly scoped and widely compatible detection rules. By standardizing how data is ingested and analyzed, organizations can more effectively detect, investigate, and respond to potential threats or anomalies in logs ingested into Elastic, and in this specific case, LLM logs.

Our initial mapping begins by investigating fields provided by the vendor and existing gaps, leading to the establishment of a comprehensive schema tailored to the nuances of LLM operations. We then reconciled the fields to align with our OpenTelemetry [semantic conventions](https://github.com/open-telemetry/semantic-conventions/blob/main/docs/gen-ai/llm-spans.md). These mappings shown in the table cover various aspects:

 - **General LLM Interaction Fields**: These include basic but critical information such as the content of requests and responses, token counts, timestamps, and user identifiers, which are foundational for understanding the context and scope of interactions.
 - **Text Quality and Relevance Metric Fields**: Fields measuring text readability, complexity, and similarity scores help assess the quality and relevance of model outputs, ensuring that responses are not only accurate but also user-appropriate. 
 - **Security Metric Fields**: This class of metrics is important for identifying and quantifying potential security risks, including regex pattern matches and scores related to jailbreak attempts, prompt injections, and other security concerns such as hallucination consistency and refusal responses.
 - **Policy Enforcement Fields**: These fields capture details about specific policy enforcement actions taken during interactions, such as blocking or modifying content, and provide insights into the confidence levels of these actions, enhancing security and compliance measures.
 - **Threat Analysis Fields**: Focused on identifying and quantifying potential threats, these fields provide a detailed analysis of risk scores, types of detected threats, and the measures taken to mitigate these threats.
 - **Compliance Fields**: These fields help ensure that interactions comply with various regulatory standards, detailing any compliance violations detected and the specific rules that were triggered during the interaction.
 - **OWASP Top Ten Specific Fields**: These fields map directly to the OWASP Top 10 risks for LLM applications, helping to align security measures with recognized industry standards.
 - **Sentiment and Toxicity Analysis Fields**: These analyses are essential to gauge the tone and detect any harmful content in the response, ensuring that outputs align with ethical guidelines and standards. This includes sentiment scores, toxicity levels, and identification of inappropriate or sensitive content.
 - **Performance Metric Fields**: These fields measure the performance aspects of LLM interactions, including response times and sizes of requests and responses, which are critical for optimizing system performance and ensuring efficient operations.

![General, quality, security, policy, and threat analysis fields](/assets/images/elastic-advances-llm-security/image5.png)

![Compliance, OWASP top 10, security tools analysis, sentiment and toxicity analysis, and performance fields](/assets/images/elastic-advances-llm-security/image6.png)

Note: See the [gist](https://gist.github.com/Mikaayenson/cf03f6d3998e16834c1274f007f2666c) for an extended table of fields proposed.

These fields are mapped by our LLM integrations and ultimately used within our detections. As we continue to understand the threat landscape, we will continue to refine these fields to ensure additional fields populated by other LLM vendors are standardized and conceptually reflected within the mapping.

### Broader Implications and Benefits of Standardization

Standardizing security fields within the LLM ecosystem (e.g., user interaction and application integration) facilitates a unified approach to the security domain. Elastic endeavors to lead the charge by defining and promoting a set of standard fields. This effort not only enhances the security posture of individual organizations but also fosters a safer industry. 

**Integration with Security Tools**: By standardizing responses from LLM-related security tools, it enriches security analysis fields that can be shipped with the original LLM vendor content to a security solution. If operationally chained together in the LLM application’s ecosystem, security tools can audit each invocation request and response. Security teams can then leverage these fields to build complex detection mechanisms that can identify subtle signs of misuse or vulnerabilities within LLM interactions. 

**Consistency Across Vendors**: Insisting that all LLM vendors adopt these standard fields drives a singular goal to effectively protect applications, but in a way that establishes a baseline that all industry users can adhere to. Users are encouraged to align to a common schema regardless of the platform or tool. 

**Enhanced Detection Engineering**: With these standard fields, detection engineering becomes more robust and the change of false positives is decreased. Security engineers can create effective rules that identify potential threats across different models, interactions, and ecosystems. This consistency is especially important for organizations that rely on multiple LLMs or security tools and need to maintain a unified platform.

#### Sample LLM-specific fields: AWS Bedrock use case

Based on the integration’s ingestion pipeline, field mappings, and processors, the AWS Bedrock data is cleaned up, standardized, and mapped to Elastic Common Schema ([ECS](https://www.elastic.co/guide/en/ecs/current/ecs-reference.html)) fields. The core Bedrock fields are then introduced under the ```aws.bedrock``` group which includes details about the model invocation like requests, responses, and token counts. The integration populates additional fields tailored for the LLM to provide deeper insights into the model’s interactions which are later used in our detections.  

### LLM detection engineering examples

With the standardized fields and the Elastic AWS Bedrock integration, we can begin crafting detection engineering rules that showcase the proposed capability with varying complexity. The below examples are written using [ES|QL](https://www.elastic.co/guide/en/security/8.13/rules-ui-create.html#create-esql-rule).

Note: Check out the detection-rules [hunting](https://github.com/elastic/detection-rules/tree/main/hunting) directory and [```aws_bedrock```](https://github.com/elastic/detection-rules/tree/main/rules/integrations/aws_bedrock) rules for more details about these queries.

#### Basic detection of sensitive content refusal

With current policies and standards on sensitive topics within the organization, it is important to have mechanisms in place to ensure LLMs also adhere to compliance and ethical standards. Organizations have an opportunity to monitor and capture instances where an LLM directly refuses to respond to sensitive topics.

**Sample Detection**:

```
from logs-aws_bedrock.invocation-*
 | WHERE @timestamp > NOW() - 1 DAY
   AND (
     gen_ai.completion LIKE "*I cannot provide any information about*"
     AND gen_ai.response.finish_reasons LIKE "*end_turn*"
   )
 | STATS user_request_count = count() BY gen_ai.user.id
 | WHERE user_request_count >= 3
```

**Detection Description**: This query is used to detect instances where the model explicitly refuses to provide information on potentially sensitive or restricted topics multiple times. Combined with predefined formatted outputs, the use of specific phrases like "I cannot provide any information about" within the output content indicates that the model has been triggered by a user prompt to discuss something it's programmed to treat as confidential or inappropriate. 

**Security Relevance**: Monitoring LLM refusals helps to identify attempts to probe the model for sensitive data or to exploit it in a manner that could lead to the leakage of proprietary or restricted information. By analyzing the patterns and frequency of these refusals, security teams can investigate if there are targeted attempts to breach information security policies.

### Potential denial of service or resource exhaustion attacks

Due to the engineering design of LLMs being highly computational and data-intensive, they are susceptible to resource exhaustion and denial of service (DoS) attacks. High usage patterns may indicate abuse or malicious activities designed to degrade the LLM’s availability. Due to the ambiguity of correlating prompt request size directly with token count, it is essential to consider the implications of high token counts in prompts which may not always result from larger requests bodies. Token count and character counts depend on the specific model, where each can be different and is related to how embeddings are generated. 

**Sample Detection**:

```
from logs-aws_bedrock.invocation-*
 | WHERE @timestamp > NOW() - 1 DAY
   AND (
     gen_ai.usage.prompt_tokens > 8000 OR
     gen_ai.usage.completion_tokens > 8000 OR
     gen_ai.performance.request_size > 8000
   )
 | STATS max_prompt_tokens = max(gen_ai.usage.prompt_tokens),
         max_request_tokens = max(gen_ai.performance.request_size),
         max_completion_tokens = max(gen_ai.usage.completion_tokens),
         request_count = count() BY cloud.account.id
 | WHERE request_count > 1
 | SORT max_prompt_tokens, max_request_tokens, max_completion_tokens DESC
```

**Detection Description**: This query identifies high-volume token usage which could be indicative of abuse or an attempted denial of service (DoS) attack. Monitoring for unusually high token counts (input or output) helps detect patterns that could slow down or overwhelm the system, potentially leading to service disruptions. Given each application may leverage a different token volume, we’ve chosen a simple threshold based on our existing experience that should cover basic use cases.

**Security Relevance**: This form of monitoring helps detect potential concerns with system availability and performance. It helps in the early detection of DoS attacks or abusive behavior that could degrade service quality for legitimate users. By aggregating and analyzing token usage by account, security teams can pinpoint sources of potentially malicious traffic and take appropriate measures.

#### Monitoring for latency anomalies

Latency-based metrics can be a key indicator of underlying performance issues or security threats that overload the system. By monitoring processing delays, organizations can ensure that servers are operating as efficiently as expected.

**Sample Detection**:

```
from logs-aws_bedrock.invocation-*
 | WHERE @timestamp > NOW() - 1 DAY
 | EVAL response_delay_seconds = gen_ai.performance.start_response_time / 1000
 | WHERE response_delay_seconds > 5
 | STATS max_response_delay = max(response_delay_seconds),
         request_count = count() BY gen_ai.user.id
 | WHERE request_count > 3
 | SORT max_response_delay DESC
```

**Detection Description**: This updated query monitors the time it takes for an LLM to start sending a response after receiving a request, focusing on the initial response latency. It identifies significant delays by comparing the actual start of the response to typical response times, highlighting instances where these delays may be abnormally long.

**Security Relevance**: Anomalous latencies can be symptomatic of issues such as network attacks (e.g., DDoS) or system inefficiencies that need to be addressed. By tracking and analyzing latency metrics, organizations can ensure that their systems are running efficiently and securely, and can quickly respond to potential threats that might manifest as abnormal delays.

## Advanced LLM detection engineering use cases

This section explores potential use cases that could be addressed with an Elastic Security integration. It assumes that these fields are fully populated and that necessary security auditing enrichment features (e.g., Guardrails) have been implemented, either within AWS Bedrock or via a similar approach provided by the LLM vendor. In combination with the available data source and Elastic integration, detection rules can be built on top of these Guardrail requests and responses to detect misuse of LLMs in deployment.

### Malicious model uploads and cross-tenant escalation

A recent investigation into the Hugging Face Interface API revealed a significant risk where attackers could upload a maliciously crafted model to perform arbitrary code execution. This was achieved by using a Python Pickle file that, when deserialized, executed embedded malicious code. These vulnerabilities highlight the need for rigorous security measures to inspect and sanitize all inputs in AI-as-a-Service (AIAAS) platforms from the LLM, to the infrastructure that hosts the model, and the application API integration. Refer to [this article](https://www.wiz.io/blog/wiz-and-hugging-face-address-risks-to-ai-infrastructure) for more details.

**Potential Detection Opportunity**: Use fields like ```gen_ai.request.model.id```, ```gen_ai.request.model.version```, and prompt ```gen_ai.completion``` to detect interactions with anomalous models. Monitoring unusual values or patterns in the model identifiers and version numbers along with inspecting the requested content (e.g., looking for typical Python Pickle serialization techniques) may indicate suspicious behavior. Similarly, a check prior to uploading the model using similar fields may block the upload. Cross-referencing additional fields like ```gen_ai.user.id``` can help identify malicious cross-tenant operations performing these types of activities.

### Unauthorized URLs and external communication

As LLMs become more integrated into operational ecosystems, their ability to interact with external capabilities like email or webhooks can be exploited by attackers. To protect against these interactions, it’s important to implement detection rules that can identify suspicious or unauthorized activities based on the model’s outputs and subsequent integrations.

**Potential Detection Opportunity**: Use fields like ```gen_ai.completion```, and ```gen_ai.security.regex_pattern_count``` to triage malicious external URLs and webhooks. These regex patterns need to be predefined based on well-known suspicious patterns.

#### Hierarchical instruction prioritization

LLMs are increasingly used in environments where they receive instructions from various sources (e.g., [ChatGPT Custom Instructions](https://openai.com/blog/custom-instructions-for-chatgpt)), which may not always have benign intentions. This build-your-own model workflow can lead to a range of potential security vulnerabilities, if the model treats all instructions with equal importance, and they go unchecked. Reference [here](https://arxiv.org/pdf/2404.13208.pdf). 

**Potential Detection Opportunity**: Monitor fields like ```gen_ai.model.instructions``` and ```gen_ai.completion``` to identify discrepancies between given instructions and the models responses which may indicate cases where models treat all instructions with equal importance. Additionally, analyze the ```gen_ai.similarity_score```, to discern how similar the response is from the original request.

### Extended detections featuring additional Elastic rule types

This section introduces additional detection engineering techniques using some of Elastic’s rule types, Threshold, Indicator Match, and New Terms to provide a more nuanced and robust security posture. 

 - **Threshold Rules**: Identify high frequency of denied requests over a short period of time grouped by ```gen_ai.user.id``` that could be indicative of abuse attempts. (e.g. OWASP’s LLM04) 
 - **Indicator Match Rules**: Match known malicious threat intel provided indicators such as the LLM user ID like the ```gen_ai.user.id``` which contain these user attributes. (e.g. ``arn:aws:iam::12345678912:user/thethreatactor``) 
 - **New Terms Rules**: Detect new or unusual terms in user prompts that could indicate usual activity outside of the normal usage for the user’s role, potentially indicating new malicious behaviors.

## Summary

Elastic is pioneering the standardization of LLM-based fields across the generative AI landscape to enable security detections across the ecosystem. This initiative not only aligns with our ongoing enhancements in LLM integration and security strategies but also supports our broad security framework that safeguards both direct user interactions and the underlying system architectures. By promoting a uniform language among LLM vendors for enhanced detection and response capabilities, we aim to protect the entire ecosystem, making it more secure and dependable. Elastic invites all stakeholders within the industry, creators, maintainers, integrators and users, to adopt these standardized practices, thereby strengthening collective security measures and advancing industry-wide protections.

As we continue to add and enhance our integrations, starting with AWS Bedrock, we are strategizing to align other LLM-based integrations to the new standards we’ve set, paving the way for a unified experience across the Elastic ecosystem. The seamless overlap with existing Elasticsearch capabilities empowers users to leverage sophisticated search and analytics directly on the LLM data, driving existing workflows back to tools users are most comfortable with. 

Check out the [LLM Safety Assessment](https://www.elastic.co/security/llm-safety-report), which delves deeper into these topics.

__The release and timing of any features or functionality described in this post remain at Elastic's sole discretion. Any features or functionality not currently available may not be delivered on time or at all.__
