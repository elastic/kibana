---
title: "Using LLMs and ESRE to find similar user sessions"
slug: "using-llms-and-esre-to-find-similar-user-sessions"
date: "2023-09-19"
description: "In our previous article, we explored using the GPT-4 Large Language Model (LLM) to condense Linux user sessions. In the context of the same experiment, we dedicated some time to examine sessions that shared similarities. These similar sessions can subsequently aid the analysts in identifying related suspicious activities."
author:
  - slug: kirti-sodhi
  - slug: susan-chang
  - slug: apoorva-joshi
image: "photo-edited-03@2x.jpg"
category:
  - slug: detection-science
  - slug: machine-learning
  - slug: generative-ai
---

## Using LLMs and ESRE to find similar user sessions

In our [previous article](https://www.elastic.co/security-labs/using-llms-to-summarize-user-sessions), we explored using the GPT-4 Large Language Model (LLM) to condense complex Linux user sessions into concise summaries. We highlighted the key takeaways from our experiments, shedding light on the nuances of data preprocessing, prompt tuning, and model parameter adjustments. In the context of the same experiment, we dedicated some time to examine sessions that shared similarities. These similar sessions can subsequently aid the analysts in identifying related suspicious activities. We explored the following methods to find similarities in user sessions:

 - In an endeavor to uncover similar user profiles and sessions, one approach we undertook was to categorize sessions according to the actions executed by users; we accomplished this by instructing the Language Model Model (LLM) to categorize user sessions into predefined categories
 - Additionally, we harnessed the capabilities of [ELSER](https://www.elastic.co/guide/en/machine-learning/current/ml-nlp-elser.html) (Elastic’s retrieval model for semantic search) to execute a semantic search on the model summaries derived from the session summarization experiment

This research focuses on our experiments using GPT-4 for session categorization and [ESRE](https://www.elastic.co/elasticsearch/elasticsearch-relevance-engine) for semantic search.

## Leveraging GPT for Session Categorization

We consulted a security research colleague with domain expertise to define nine categories for our dataset of 75 sessions. These categories generalize the main behaviors and significant features observed in the sessions. They include the following activities:

* Docker Execution
* Network Operations
* File Searches
* Linux Command Line Usage
* Linux Sandbox Application Usage
* Pip Installations
* Package Installations
* Script Executions
* Process Executions

## Lessons learned

For our experiments, we used a GPT-4 deployment in Azure AI Studio with a token limit of 32k. To explore the potential of the GPT model for session categorization, we conducted a series of experiments, directing the model to categorize sessions by inputting the same JSON summary document we used for the [session summarization process](https://www.elastic.co/security-labs/using-llms-to-summarize-user-sessions). 

This effort included multiple iterations, during which we concentrated on enhancing prompts and [Few-Shot](https://help.openai.com/en/articles/6654000-best-practices-for-prompt-engineering-with-openai-api) Learning. As for the model parameters, we maintained a [Temperature of 0](https://txt.cohere.com/llm-parameters-best-outputs-language-ai/) in an effort to make the outputs less diverse.

### Prompt engineering
*Takeaway:* Including explanations for categories in the prompts does not impact the model's performance.

The session categorization component was introduced as an extension to the session summarization prompt. We explored the effect of incorporating contextual explanations for each category alongside the prompts. Intriguingly, our findings revealed that appending illustrative context did not significantly influence the model's performance, as compared to prompts devoid of such supplementary information.

Below is a template we used to guide the model's categorization process:

```
You are a cybersecurity assistant, who helps Security analysts in summarizing activities that transpired in a Linux session. A summary of events that occurred in the session will be provided in JSON format. No need to explicitly list out process names and file paths. Summarize the session in ~3 paragraphs, focusing on the following: 
- Entities involved in the session: host name and user names.
- Overview of any network activity. What major source and destination ips are involved? Any malicious port activity?
- Overview of any file activity. Were any sensitive files or directories accessed?
- Highlight any other important process activity
- Looking at the process, network, and file activity, what is the user trying to do in the session? Does the activity indicate malicious behavior?

Also, categorize the below Linux session in one of the following 9 categories: Network, Script Execution, Linux Command Line Utility, File search, Docker Execution, Package Installations, Pip Installations, Process Execution and Linux Sandbox Application.

A brief description for each Linux session category is provided below. Refer to these explanations while categorizing the sessions.
- Docker Execution: The session involves command with docker operations, such as docker-run and others
- Network: The session involves commands with network operations
- File Search: The session involves file operations, pertaining to search
- Linux Command Line Utility: The session involves linux command executions
- Linux Sandbox Application: The session involves a sandbox application activity. 
- Pip Installations: The session involves python pip installations
- Package Installations: The session involves package installations or removal activities. This is more of apt-get, yum, dpkg and general command line installers as opposed to any software wrapper
- Script Execution: The session involves bash script invocations. All of these have pointed custom infrastructure script invocations
- Process Execution: The session focuses on other process executions and is not limited to linux commands. 
 ###
 Text: {your input here}
```

### Few-shot tuning
*Takeaway:* Adding examples for each category improves accuracy.

Simultaneously, we investigated the effectiveness of improving the model's performance by including one example for each category in the above prompt. This strategy resulted in a significant enhancement, notably boosting the model's accuracy by 20%.

## Evaluating GPT Categories

The assessment of GPT categories is crucial in measuring the quality and reliability of the outcomes. In the evaluation of categorization results, a comparison was drawn between the model's categorization and the human categorization assigned by the security expert (referred to as "Ground_Truth" in the below image). We calculated the total accuracy based on the number of successful matches for categorization evaluation.

![Evaluating Session Categories](/assets/images/using-llms-and-esre-to-find-similar-user-sessions/image2.png)

We observed that GPT-4 faced challenges when dealing with samples bearing multiple categories. However, when assigning a single category, it aligned with the human categorization in 56% of cases. The "Linux Command Line Utility" category posed a particular challenge, with 47% of the false negatives, often misclassified as "Process Execution" or "Script Execution." This discrepancy arose due to the closely related definitions of the "Linux Command Line Utility" and "Process Execution" categories and there may have also been insufficient information in the prompts, such as process command line arguments, which could have served as a valuable distinguishing factor for these categories.

Given the results from our evaluation, we conclude that we either need to tune the descriptions for each category in the prompt or provide more examples to the model via few-shot training. Additionally, it's worth considering whether GPT is the most suitable choice for classification, particularly within the context of the prompting paradigm.

## Semantic search with ELSER

We also wanted to try [ELSER](https://www.elastic.co/guide/en/machine-learning/current/ml-nlp-elser.html#ml-nlp-elser), the Elastic Learned Sparse EncodeR for semantic search. Semantic search focuses on contextual meaning, rather than strictly exact keyword inputs, and ELSER is a retrieval model trained by Elastic that enables you to perform semantic search and retrieve more relevant results.

We tried some examples of semantic search questions on the session summaries. The session summaries were stored in an Elasticsearch index, and it was simple to download the ELSER model following an [official tutorial](https://www.elastic.co/guide/en/machine-learning/current/ml-nlp-elser.html#ml-nlp-elser). The tokens generated by ELSER are stored in the index, as shown in the image below:

![Tokens generated by ELSER](/assets/images/using-llms-and-esre-to-find-similar-user-sessions/image1.png)

Afterward, semantic search on the index was overall able to retrieve the most relevant events. Semantic search queries about the events included:

 - Password related – yielding 1Password related logs
 - Java – yielding logs that used Java
 - Python – yielding logs that used Python
 - Non-interactive session
 - Interactive session

An example of semantic search can be seen in the Dev Tools console through a [text_expansion query](https://www.elastic.co/guide/en/elasticsearch/reference/8.9/semantic-search-elser.html#text-expansion-query).

![Example screenshot of using semantic search with the Elastic dev tools console](/assets/images/using-llms-and-esre-to-find-similar-user-sessions/image5.png)

Some takeaways are: 

* For semantic search, the prompt template can cause the summary to have too many unrelated keywords. For example, we wanted every summary to include an assessment of whether or not the session should be considered "malicious", that specific word was always included in the resulting summary. Hence, the summaries of benign sessions and malicious sessions alike contained the word "malicious" through sentences like "This session is malicious" or "This session is not malicious". This could have impacted the accuracy.
* Semantic search seemed unable to differentiate effectively between certain related concepts, such as interactive vs. non-interactive. A small number of specific terms might not have been deemed important enough to the core meaning of the session summary for semantic search.
* Semantic search works better than [BM25](https://link.springer.com/referenceworkentry/10.1007/978-0-387-39940-9_921) for cases where the user doesn’t specify the exact keywords. For example, searching for "Python" or "Java" related logs and summaries is equally effective with both ELSER and BM25. However, ELSER could retrieve more relevant data when searching for “object oriented language” related logs. In contrast, using a keyword search for “object oriented language” doesn’t yield relevant results, as shown in the image below.

![Semantic search can yield more relevant results when keywords aren’t matching](/assets/images/using-llms-and-esre-to-find-similar-user-sessions/image4.png)

## What's next
We are currently looking into further improving summarization via [retrieval augmented generation (RAG)](https://arxiv.org/pdf/2005.11401.pdf), using tools in the [Elastic Search and Relevance Engine](https://www.elastic.co/guide/en/esre/current/index.html) (ESRE). In the meantime, we’d love to hear about your experiments with LLMs, ESRE, etc. If you'd like to share what you're doing or run into any issues during the process, please reach out to us on our [community Slack channel](https://ela.st/slack) and [discussion forums](https://discuss.elastic.co/c/security). 
