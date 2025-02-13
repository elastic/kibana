---
title: "Exploring the Future of Security with ChatGPT"
slug: "exploring-applications-of-chatgpt-to-improve-detection-response-and-understanding"
date: "2023-04-24"
subtitle: "Ambitious applications of ChatGPT to improve detection, response, and understanding"
description: "Recently, OpenAI announced APIs for engineers to integrate ChatGPT and Whisper models into their apps and products. For some time, engineers could use the REST API calls for older models and otherwise use the ChatGPT interface through their website."
author:
  - slug: mika-ayenson
image: "blog-elastic-train.jpg"
category:
  - slug: detection-science
  - slug: machine-learning
  - slug: security-operations
  - slug: security-research
  - slug: generative-ai
---

### Preamble

Recently, OpenAI [announced](https://openai.com/blog/introducing-chatgpt-and-whisper-apis) APIs for engineers to integrate [ChatGPT](https://chat.openai.com/chat) and Whisper models into their apps and products. For some time, engineers could use the REST API calls for older models and otherwise use the ChatGPT interface through their website. Now there's an opportunity to prototype and experiment with Large Language Models (LLMs) to assist with security use cases.

The defensively-minded possibilities are endless for applying the older [gpt-3.5-turbo](https://platform.openai.com/docs/models/gpt-3-5) and soon [gpt-4](https://platform.openai.com/docs/models/gpt-4) models but here are just a few ideas:

- Chatbot-assisted Incident Response: Creating a chatbot that can identify and respond to security incidents in real-time to achieve a desired outcome. The chatbot can use ChatGPT to analyze the incident and provide an appropriate and configurable response (e.g. execute response actions, recommend new queries, etc.).
- Threat information: Using ChatGPT to analyze threat data and generate reports for your security product. This will help to improve the mean-time to respond.
- Natural language search: Implementing natural language search capabilities in your security product. ChatGPT can be used to understand and optimize search queries, for more accurate and relevant results.
- Anomaly detection: Using ChatGPT to analyze event data to identify anomalies that may indicate a security breach (although will require local domain context training).
- Security policy chatbot: Creating a chatbot that can answer security-related questions while investigating threats. The chatbot can use ChatGPT to provide accurate and relevant answers to questions about security policies, best practices, summarizing information, and more.
- Alert prioritization: Using the data within the alerts to group and prioritize the most relevant information to the analyst for an expedited response.

#### Overview

The relevance of results from a tool like ChatGPT depends a great deal on the data provided and the question asked. Garbage in: garbage out. To minimize costs during prototyping, we chose a small number of available fields (see below). There will always be a bit of tuning and engineering to get the best out of a model like this.

The following fields are included:

```
"event.kind",
"signal.rule.severity",
"kibana.alert.rule.name",
"signal.reason",
"signal.rule.type",
"signal.rule.interval",
"signal.rule.risk_score",
"kibana.alert.rule.producer",
"kibana.alert.rule.description"
```

If you decide to play around with the [code](https://gist.github.com/Mikaayenson/9efff700e5d799c672c6b17338d2de6a), feel free to modify the fields as needed. Also, we'd love to hear what you're doing if you've already pulled something together. Or if you just want to chat about cool ideas, feel free to reach out! Now let's get into some fun. 😎

##### Simple use case: ELI5

No matter how experienced you are in the security domain, there will always be changes and new developments. They keep the security world exciting but also challenge us to stay up to date, especially when it pertains to threats. But often the detection engineer that created a query to identify malicious activity is not the same person responding to a threat. And, notably, those individuals will prioritize different knowledge and come with their own sets of unique experiences.

The following Example simply queries the detection engine for alerts and then explains them in several ways. Some of the explanations were insightful, and some were humorous. You should try it out yourself.

##### Malicious Behavior Prevention alert

From the [Suspicious Microsoft IIS Worker Descendant detection](https://www.elastic.co/guide/en/security/current/microsoft-exchange-worker-spawning-suspicious-processes.html) rule, we start with the first prompt “Summary the Elastic event:” and in each example, it's followed by the response provided by chatGPT.

This first example is short and sweet, to highlight the basic functionality. Summarize the Elastic event:

> The summary of the elastic event is that it produces a detection alert whenever a suspicious Microsoft IIS Worker Descendant is detected by Elastic Endpoint Security. This alert helps in investigating the endpoint alerts promptly.

Sometimes you need to provide an explanation to a layperson without security experience or expertise The term “explain it like I’m five” originated in 2010 on Twitter and was later seen on the subreddit, r/explainlikeimfive. Language is hard. Explaining complicated or nuanced things is even harder. In the most endearing way possible, sometimes we just need someone to explain it like we’re five.

Explain this Elastic event like I'm five:

> So, you know how sometimes there are bad guys who try to do bad things on our computers? Well, there is a special program called Elastic Endpoint Security that helps protect our computers from those bad guys. When it detects something suspicious, it will send an alert to the grown-ups who are taking care of the computer. This alert has a special name - Malicious Behavior Prevention Alert: Suspicious Microsoft IIS Worker Descendant. Now, the people who take care of the computer have another special program called SIEM. SIEM keeps an eye on all the alerts that Elastic Endpoint Security sends, and if it sees one of these special alerts, it will tell the grown-ups right away so they can investigate and make sure everything is okay. So, this message just means that SIEM got an alert from Elastic Endpoint Security, and it's letting the grown-ups know so they can take care of it.

Sometimes your kids may want to know how your day went. ChatGPT can even help in this (unconventional) area.

Explain this event to my kids:

> There was something weird that happened on a computer, and the people who take care of it wanted to know about it right away. They made a rule that sends an alert whenever something strange happens on that computer. This way, they can look into it and make sure everything is okay.

This example is interesting. Without the context of what kind of leadership you have, this response may not be enough. It might even be interpreted as insulting 😅. Like any other tool, make sure you’re using it in a safe and appropriate way.

Explain this event to my boss:

> This event indicates that a rule named "Malicious Behavior Prevention Alert: Suspicious Microsoft IIS Worker Descendant" was triggered by the SIEM system. This rule is designed to generate an alert whenever any suspicious activity related to Elastic Endpoint Security is detected. By enabling this rule, we can quickly investigate any potential threats to our Endpoint security.

This next example is great for training entry-level analysts. It provides intentional words that you want to hear when onboarding someone to a new role.

Explain this event to the new graduate:

> This event is a notification that a rule has been triggered to detect a suspicious behavior related to the Microsoft IIS Worker, which is a component of the web server software. This rule is meant to prevent any malicious behavior and generate an alert whenever an Elastic Endpoint Security alert is received. By enabling this rule, it helps to investigate the security threats quickly and take the necessary actions to mitigate them.

We can prompt in different ways, and as expected get different responses.

Explain what happened in this event:

> This event is related to a detection alert rule named "Malicious Behavior Prevention Alert: Suspicious Microsoft IIS Worker Descendant," which was produced by a SIEM. The event type is "signal," which means that the alert has been triggered based on a specific condition. The purpose of this rule is to generate a detection alert every time an Elastic Endpoint Security alert is received, which helps in the immediate investigation of the endpoint alerts. Therefore, this event indicates the occurrence of suspicious activity related to Microsoft IIS Worker Descendants and the triggering of an alert by the detection rule.

Clearly, there is room for improvement. In this next example, it preemptively explains, "Hey hey, don't ask for too much of me. I'm just an assistant."

Explain this event to the CISO:

> As a virtual assistant language model, I can explain the given event to the CISO with utmost accuracy and professionalism. This event signifies the activation of a rule in Kibana that generates an alert whenever there's suspicious behavior detected in Microsoft IIS worker descendant, which can be a potential threat to the organization's security. This rule is produced by the SIEM (Security Information and Event Management) system and is designed to detect malicious activities and alert the security team immediately. This event also mentions that the endpoint security system generates alerts that enable the security team to investigate and take necessary actions to mitigate threats. Overall, this event highlights the implementation of proactive security measures to ensure the safety of the organization's digital assets.

This last example is particularly interesting because it just scratches the surface for how to guide the team responding to this event.

What are next investigative steps to take based on this event:

> - Determine the source of the Elastic Endpoint Security alert and investigate the details of the alert to understand the specific suspicious behavior detected.
> - Review system logs to identify any other unusual activity within the network, particularly from the same system or IP address associated with the suspicious Microsoft IIS worker descendant.
> - Check for any recent changes made to the Microsoft IIS configuration or permissions that may have triggered the alert.
> - Assess the impact of the event on the affected system and determine if any data or systems were compromised.
> - Identify and isolate the affected system or systems to prevent further spread of any potential malware or malicious activity.
> - Review current security measures and identify any gaps or areas that can be improved to prevent similar incidents in the future.
> - Report the event to the relevant authorities or stakeholders, if necessary.

As you can see, this demo focuses on summarizing the gist of an alert. Imagine how powerful this could be if we decided to summarize all of the alerts for the week into a single summary for reporting. If we tweak the data sent to chatGPT and provide more fields, then we should anticipate getting more accurate responses. That engineering tradeoff of determining what the most important fields to send to get the clearest picture in a time-sensitive fashion is worth the investment. Now, let's explore one more use case.

#### Alert prioritization

Response times can impact the severity and outcome of an incident. In challenging situations (e.g. alert fatigue, high volume of alerts, lack of training, constrained resources, etc.), responders struggle with determining what to do first. For example, which alert should be investigated and why? Perhaps ChatGPT can help in this area. 🤔

Here are some example alerts that we use in the next set of conversations. Again, the data in these sample alerts are limited to a subset of fields available to conserve tokens.

##### Sample alerts

> ```
> {'kibana.alert.last_detected': '2023-02-28T16:59:46.600Z', 'kibana.alert.rule.execution.uuid': 'bcbdfcd7-ba8a-4ed2-a203-4f23d77480ec', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: DARKRADIATION Ransomware Infection', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.'} {'kibana.alert.last_detected': '2023-02-28T16:59:46.601Z', 'kibana.alert.rule.execution.uuid': 'bcbdfcd7-ba8a-4ed2-a203-4f23d77480ec', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: Suspicious Microsoft Office Child Process', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.'} {'kibana.alert.last_detected': '2023-02-28T16:59:46.601Z', 'kibana.alert.rule.execution.uuid': 'bcbdfcd7-ba8a-4ed2-a203-4f23d77480ec', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: DARKRADIATION Ransomware Infection', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.'} {'kibana.alert.last_detected': '2023-03-01T13:36:30.680Z', 'kibana.alert.rule.execution.uuid': '74f6a3e1-58d1-410d-bd22-6886be6c8cb7', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: Suspicious Microsoft IIS Worker Descendant', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.'} {'kibana.alert.last_detected': '2023-03-01T13:36:30.680Z', 'kibana.alert.rule.execution.uuid': '74f6a3e1-58d1-410d-bd22-6886be6c8cb7', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: Suspicious Microsoft IIS Worker Descendant', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.'} {'kibana.alert.last_detected': '2023-03-01T12:46:02.800Z', 'kibana.alert.rule.execution.uuid': '0025ed3f-c41c-40ea-bd29-babd28b154b4', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: Suspicious Microsoft IIS Worker Descendant', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.'} {'kibana.alert.last_detected': '2023-02-28T17:04:49.582Z', 'kibana.alert.rule.execution.uuid': '2d4965c5-a345-4f47-9deb-4135b178c7f3', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: Suspicious Bitsadmin Activity', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.'} {'kibana.alert.last_detected': '2023-03-07T20:42:25.969Z', 'kibana.alert.rule.execution.uuid': 'd3f35957-a4e5-445b-b86f-e91814274dcb', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: DARKRADIATION Ransomware Infection', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.'} {'kibana.alert.last_detected': '2023-03-07T20:42:25.969Z', 'kibana.alert.rule.execution.uuid': 'd3f35957-a4e5-445b-b86f-e91814274dcb', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: DARKRADIATION Ransomware Infection', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.'} {'kibana.alert.last_detected': '2023-03-07T20:42:25.970Z', 'kibana.alert.rule.execution.uuid': 'd3f35957-a4e5-445b-b86f-e91814274dcb', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: Suspicious Bitsadmin Activity', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.'}
> ```

When we ask ChatGPT "Which one of these alerts should I prioritize?", we get a few interesting responses. Feel free to expand the entries below to see the actual responses.

The first response doesn't answer the question. It admits that it's a challenging question and provides some general guidance on how to triage alerts. We can try modifying the prompt to get closer to a specific answer.

##### Generic response

In the next response we again receive a general response 😓, but simply repeating the same question. This time, however, it attempts to provide more specific recommendations based on the fields provided. The message is interesting, but we want to know how to prioritize alerts, not receive a general description of the alerts.

##### Generic response with field details

> It's difficult to prioritize these alerts without more context, as it depends on the severity and impact of each alert, as well as the current state of the system being monitored. However, here are some general guidelines based on the information provided: The alerts with the most recent "kibana.alert.last_detected" timestamp may be more urgent, as they indicate a more recent occurrence of a potentially malicious activity. Alerts with the same "kibana.alert.rule.name" and "kibana.alert.rule.description" but different "kibana.alert.rule.execution.uuid" may indicate multiple instances of the same type of activity, and may be worth investigating further. Alerts with different "kibana.alert.rule.name" and "kibana.alert.rule.description" may indicate different types of malicious activity, and should be evaluated based on their severity and impact on the system. Ultimately, the best course of action is to have a clear plan and protocol for responding to alerts, and to evaluate each alert based on its specific context and potential impact on the system being monitored.

After adding the new fields to the original events, we get a more informed response (as expected). We try adding two fields that should dramatically impact the response and recommendations provided.

Feeding more context to ChatGPT can always help get a better answer, but remember when cost is a concern, sometimes we have to be very picky about which fields (and how much data) we want to send. To no surprise, we immediately obtain improved responses after adding these important pieces of information. In this case, since the alerts are all very similar, it chooses the timestamp to prioritize the alert.

> "kibana.alert.rule.risk_score", "kibana.alert.rule.severity",

##### Prioritizing recommendation

> It seems like all the alerts have the same information and are related to the same type of alert: Malicious Behavior Prevention Alert. They are all of medium severity and have the same risk score. Therefore, I suggest investigating the most recent alert since it was detected at a later time, and it might indicate that the issue is ongoing or has occurred again. In this case, the alert with the timestamp of 2023-03-07T20:42:25.969Z is the most recent one, so I recommend prioritizing it. However, I would still recommend investigating all the alerts since they are related to the same type of threat and could provide valuable information for understanding and mitigating the issue.

We can try shrinking similar alerts down to one alert by rule name to see how the volume of alerts (in a contrived way) impacts the response. Yet again, we get a slightly more direct response even though the alerts have the same risk score and severity level. At least this time we get a specific rule name somewhere in the response.

##### Reduced sample alerts by rule name

> ```
> {'kibana.alert.last_detected': '2023-03-07T20:42:25.969Z', 'kibana.alert.rule.execution.uuid': 'd3f35957-a4e5-445b-b86f-e91814274dcb', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: DARKRADIATION Ransomware Infection', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.', 'kibana.alert.rule.risk_score': 74, 'kibana.alert.rule.severity': 'critical'} {'kibana.alert.last_detected': '2023-03-07T20:42:25.970Z', 'kibana.alert.rule.execution.uuid': 'd3f35957-a4e5-445b-b86f-e91814274dcb', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: Suspicious Bitsadmin Activity', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.', 'kibana.alert.rule.risk_score': 47, 'kibana.alert.rule.severity': 'medium'} {'kibana.alert.last_detected': '2023-03-07T20:42:25.970Z', 'kibana.alert.rule.execution.uuid': 'd3f35957-a4e5-445b-b86f-e91814274dcb', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: Suspicious Microsoft Office Child Process', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.', 'kibana.alert.rule.risk_score': 21, 'kibana.alert.rule.severity': 'low'}
> ```

##### Prioritized alert

> Based on the information provided, all three alerts have the same risk score and severity level, and they appear to be related to the same type of detection for malicious behavior in the Elastic Endpoint Security system. Therefore, it may be important to investigate all three alerts to ensure that there are no broader patterns of malicious activity in the system. However, if there are limitations on resources and time available for investigation, it may be reasonable to prioritize the alert with the most specific and detailed name and description, which in this case is "Malicious Behavior Prevention Alert: DARKRADIATION Ransomware Infection." This alert may indicate a more serious and urgent threat that requires immediate attention.

Finally, we manipulate the fields to change the severity and risk score for experimental purposes and set the DARKRADIATION alert to a critical severity and high-risk score. We end the exploration with a direct response based on specific fields recommending the alert DARKRADIATION, and ChatGPT explains why the alert is the best choice, which is closer to what we're looking for.

So why would we want to use an LLM if we can simply prioritize alerts using a rules-based strategy (e.g. sort alerts by highest severity)? As we saw earlier, other factors can impact the response (volume of alerts, the similarity of alerts, etc.), where at the end of the day the recommendation may be ultimately based on a timestamp or another field provided that is not as obvious to the responder.

##### Sample alerts with varying severity & risk score

> ```
> {'kibana.alert.last_detected': '2023-03-07T20:42:25.969Z', 'kibana.alert.rule.execution.uuid': 'd3f35957-a4e5-445b-b86f-e91814274dcb', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: DARKRADIATION Ransomware Infection', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.', 'kibana.alert.rule.risk_score': 74, 'kibana.alert.rule.severity': 'critical'} {'kibana.alert.last_detected': '2023-03-07T20:42:25.970Z', 'kibana.alert.rule.execution.uuid': 'd3f35957-a4e5-445b-b86f-e91814274dcb', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: Suspicious Bitsadmin Activity', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.', 'kibana.alert.rule.risk_score': 47, 'kibana.alert.rule.severity': 'medium'} {'kibana.alert.last_detected': '2023-03-07T20:42:25.970Z', 'kibana.alert.rule.execution.uuid': 'd3f35957-a4e5-445b-b86f-e91814274dcb', 'kibana.alert.rule.name': 'Malicious Behavior Prevention Alert: Suspicious Microsoft Office Child Process', 'kibana.alert.rule.producer': 'siem', 'event.kind': 'signal', 'kibana.alert.rule.description': 'Generates a detection alert each time an Elastic Endpoint Security alert is received. Enabling this rule allows you to immediately begin investigating your Endpoint alerts.', 'kibana.alert.rule.risk_score': 21, 'kibana.alert.rule.severity': 'low'}
> ```

##### Prioritized alert with details

> Based on the severity and risk scores provided in the alerts, the Malicious Behavior Prevention Alert for DARKRADIATION Ransomware Infection should be prioritized. This alert has a severity level of "critical" and a risk score of 74, which indicates that it poses a significant threat and requires immediate attention. In comparison, the other two alerts have lower severity levels and risk scores, suggesting that they are of lower priority. However, it's worth noting that the specific context and environment in which these alerts were generated could also impact their prioritization. Therefore, it's important to carefully evaluate all available information before making a final decision.

We've always known more context potentially can yield better responses. In this case, we used a combination of 1) reducing the alerts by Rule Name, and 2) providing more useful fields targeted to the question we wanted to answer. If we change the question, then we most likely need to provide different fields, which gets back to a broader question of what data should we provide to cost-effectively get the answer we're looking for.

##### Small discussion on LLMs for undesirable outcomes

The major question here is, how can the security industry take advantage of LLMs like ChatGPT to prepare for undesirable outcomes (e.g., data breach, malware infection, insider threat, DOS-type cyber attack). This topic drives towards an exciting new topic of domain-specific context, and if LLM is the giant machine, then what will we get out of it?

Here are some well-known concepts that we can tap into: - Contextualizing alerts: Deep diving through past alerts and providing relevant insights to the analyst.

- Training new models: Applying transfer-learning techniques to train new predictive models that are tailored to an organization's specific dataset and security needs. This training would cover large sets of historical reports, logs, ELT-prepped network traffic, responses, etc.

- Automating all the things: Automating the mundane tasks away, sounds simple, but will challenge our ability to trust in automation.

- Threat modeling: Create highly representative threat models and attacks that adversaries may exploit to reinforce and improve an organization's security posture.

We've seen the security world gravitate towards ML for anomaly detection. As more of these LLMs become available and grow in capability, we have to tune ChatGPT magic to fit in our existing workflows and be comfortable replacing/upgrading old processes. At the very least, new ChatGPT applications will inspire new research questions, experiments, and proofs-of-concept. The key factor is not who develops the initial security-LLM application, but rather who can derive the most benefit from it for their product or organization.

Start asking the questions. What am I missing in my policy? What gaps are in my detections? What does this alert mean? These types of questions will lead to great opportunities to use LLMs and add the extra protection you may have missed. With [GPT-4’](https://openai.com/research/gpt-4)s release and image capabilities, improved reasoning creates even more opportunities to extend into the security domain. Just imagine capturing user activities in a graphic that morphs over time (e.g. standard plot, rorschach graphic, etc.) and using a future GPT-X that can interpret trends, detect anomalies, or even track entity analytics! The classification and analysis possibilities are endless, and I encourage everyone to continue merging into new domains.

It was fun playing around with the overlapping domains of security and LLMs, and the gist file we provide may one day evolve into a full project. 🤷 We didn't prove out all of the use cases, but that leaves room for future opportunities, research, POCs and research to explore with the future versions of gpt!

We hope you enjoyed the read! See below for how to get started with the summary demo.

##### Try it yourself!

If you want to try this out for yourself, you'll need a few things. - [Signup](https://platform.openai.com/signup) to get an OpenAI account, following the [guide](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety) for best practices. - Grab the [gist](https://gist.github.com/Mikaayenson/9efff700e5d799c672c6b17338d2de6a), which has the code. Disclaimer: The API continues to evolve, which may require minor changes. - This example uses Elastic, so [Signup](https://www.elastic.co/cloud/cloud-trial-overview/security) to get a free Elastic security trial. You will also benefit from having some experience with the [security detection engin](https://www.elastic.co/guide/en/security/current/detection-engine-overview.html)e.
