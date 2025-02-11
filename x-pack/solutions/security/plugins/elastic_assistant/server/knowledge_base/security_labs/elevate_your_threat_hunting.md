---
title: "Elevate Your Threat Hunting with Elastic"
slug: "elevate-your-threat-hunting"
date: "2024-10-18"
description: "Elastic is releasing a threat hunting package designed to aid defenders with proactive detection queries to identify actor-agnostic intrusions."
author:
  - slug: terrance-dejesus
  - slug: mika-ayenson
  - slug: samir-bousseaden
  - slug: justin-ibarra
image: "elevate-your-threat-hunting.jpg"
category:
  - slug: security-operations
tags:
  - threat hunting
---

We are excited to announce a new resource in the Elastic [Detection Rules](https://github.com/elastic/detection-rules) repository: a collection of hunting queries powered by various Elastic query languages!

These hunting queries can be found under the [Hunting](https://github.com/elastic/detection-rules/tree/main/hunting) package. This initiative is designed to empower our community with specialized threat hunting queries and resources across multiple platforms, complementing our robust SIEM and EDR ruleset. These are developed to be consistent with the paradigms and methodologies we discuss in the Elastic [Threat Hunting guide](https://www.elastic.co/security/threat-hunting).

## Why Threat Hunting?

Threat hunting is a proactive approach to security that involves searching for hidden threats that evade conventional detection solutions while assuming breach. At Elastic, we recognize the importance of threat hunting in strengthening security defenses and are committed to facilitating this critical activity.

While we commit a substantial amount of time and effort towards building out resilient detections, we understand that alerting on malicious behavior is only one part of an effective overall strategy. Threat hunting moves the needle to the left, allowing for a more proactive approach to understanding and securing the environment.

The idea is that the rules and hunt queries will supplement each other in many ways. Most  hunts also serve as great pivot points once an alert has triggered, as a powerful means to ascertain related details and paint a full picture. They are just as useful when it comes to triaging as proactively hunting.

Additionally, we often find ourselves writing resilient and robust logic that just doesn’t meet the criteria for a rule, whether it is too noisy or not specific enough. This will serve as an additional means to preserve the value of these research outcomes in the form of these queries.

## What We Are Providing

The new Hunting package provides a diverse range of hunting queries targeting all the same  environments as our rules do, and potentially even more, including:

* Endpoints (Windows, Linux, macOS)
* Cloud (CSPs, SaaS providers, etc.)
* Network
* Large Language Models (LLM)
* Any other Elastic [integration](https://www.elastic.co/integrations) or datasource that adds value

These queries are crafted by our security experts to help you gather initial data that is required to test your hypothesis during your hunts. These queries also include names and descriptions that may be a starting point for your hunting efforts as well. All of this valuable information is then stored in an index file (both YAML and Markdown) for management, ease-of-use and centralizing our collection of hunting queries.

### Hunting Package

The Hunting package has also been made to be its own module within Detection Rules with a few simple commands for easy management and searching throughout the catalogue of hunting queries. Our goal is not to provide an out-of-the-box hunting tool, but rather a foundation for programmatically managing and eventually leveraging these hunting queries. 

Existing Commands:

**Generate Markdown** - Load TOML files or path of choice and convert to Markdown representation in respective locations.
![](/assets/images/elevate-your-threat-hunting/image6.png "")

**Refresh Index** - Refresh indexes from the collection of queries, both YAML and Markdown.
![](/assets/images/elevate-your-threat-hunting/image4.png "")

**Search** - Search for hunting queries based on MITRE tactic, technique or subtechnique IDs. Also includes the ability to search per data source.
![](/assets/images/elevate-your-threat-hunting/image5.png "")

**Run Query** - Run query of choice against a particular stack to identify hits (requires pre-auth). Generates a search link for easy pivot.
![](/assets/images/elevate-your-threat-hunting/image8.png "")

**View Hunt**- View a hunting file in TOML or JSON format.
![](/assets/images/elevate-your-threat-hunting/image7.png "")

**Hunt Summary**- Generate count statistics based on breakdown of integration, platform, or language
![](/assets/images/elevate-your-threat-hunting/image2.png "")

## Benefits of these Hunt Queries

Each hunting query will be saved in its respective TOML file for programmatic use, but also have a replicated markdown file that serves as a quick reference for manual tasks or review. We understand that while automation is crucial to hunting maturity, often hunters may want a quick and easy copy-paste job to reveal events of interest. Our collection of hunt queries and CLI options offers several advantages to both novice and experienced threat hunters. Each query in the library is designed to serve as a powerful tool for detecting hidden threats, as well as offering additional layers of investigation during incident response.

* Programmatic and Manual Flexibility: Each query is structured in a standardized TOML format for programmatic use, but also offers a Markdown version for those who prefer manual interaction. 
* Scalable queries: Our hunt queries are designed with scalability in mind, leveraging the power of Elastic’s versatile and latest query languages such as ES|QL. This scalability ensures that you can continuously adapt your hunting efforts as your organization’s infrastructure grows, maintaining high levels of visibility and security.
* Integration with Elastic’s Product: These queries integrate with the Elastic Stack and our automation enables you to test quickly, enabling you to pivot through Elastic’s Security UI for deeper analysis.
* Diverse Query Types Available: Out hunt queries support a wide variety of query languages, including KQL, EQL, ES|QL, OsQuery, and YARA, making them adaptable across different data sources and environments. Whether hunting across endpoints, cloud environments, or specific integrations like Okta or LLMs, users can leverage the right language for their unique needs.
* Extended Coverage for Elastic Prebuilt Rules: While Elastic’s prebuilt detection rules offer robust coverage, there are always scenarios where vendor detection logic may not fully meet operational needs due to the specific environment or nature of the threat. These hunting queries help to fill in those gaps by offering broader and more nuanced coveraged, particularly for behaviors that don’t nearly fit into rule-based detections. 
* Stepping stone for hunt initialization or pivoting: These queries serve as an initial approach to kickstart investigations or pivot from initial findings. Whether used proactively to identify potential threats or reactively to expand upon triggered alerts, these queries can provide additional context and insights based on threat hunter hypothesis and workflows.
* MITRE ATT&CK Alignment: Every hunt query includes MITRE ATT&CK mappings to provide contextual insight and help prioritize the investigation of threats according to threat behaviors.
* Community and Maintenance: This hunting module lives within the broader Elastic Detection Rules repository, ensuring continual updates alongside our prebuilt rules. Community contributions also enable our users to collaborate and expand unique ways to hunt.

As we understand the fast-paced nature of hunting and need for automation, we have included searching capabilities and a run option to quickly identify if you have matching results from any hunting queries in this library.

## Details of Each Hunting Analytic

Each hunting search query in our repository includes the following details to maximize its effectiveness and ease of use:

* **Data Source or Integration**: The origin of the data utilized in the hunt.
* **Name**: A descriptive title for the hunting query.
* **Hypothesis**: The underlying assumption or threat scenario the hunt aims to investigate. This is representated as the description.
* **Query(s)**: Provided in one of several formats, including ES|QL, EQL, KQL, or OsQuery.
* **Notes**: Additional information on how to pivot within the data, key indicators to watch for, and other valuable insights.
* **References**: Links to relevant resources and documentation that support the hunt.
* **Mapping to MITRE ATT&CK**: How the hunt correlates to known tactics, techniques, and procedures in the MITRE ATT&CK framework.

![](/assets/images/elevate-your-threat-hunting/image9.png "")

For those who prefer a more hands-on approach, we also provide TOML files for programmatic consumption. Additionally, we offer an easy converter to Markdown for users who prefer to manually copy and paste the hunts into their systems.

### Hunting Query Creation Example:

In the following example, we will explore a basic hunting cycle for the purpose of creating a new hunting query that we want to use in later hunting cycles. Note that this is an oversimplified hunting cycle that may require several more steps in a real-world application.

**Hypothesis**: We assume that a threat adversary (TA) is targeting identity providers (IdPs), specifically Okta, by compromising cloud accounts by identifying runtime instances in CI/CD pipelines that use client credentials for authentication with Okta’s API. Their goal is to identify unsecure credentials, take these and obtain an access token whose assumed credentials are tied to an Okta administrator.

**Evidence**: We suspect that in order to identify evidence of this, we need Okta system logs that report API activity, specifically any public client app sending access token requests where the grant type provided are client credentials. We also suspect that because the TA is unaware of the mapped OAuth scopes for this application, that when the access token request is sent, it may fail due to the incorrect OAuth scopes being explicitly sent. We also know that demonstrating proof-of-possession (DPoP) is not required for our client applications during authentication workflow because doing so would be disruptive to operations so we prioritize operability over security.

Below is the python code used to emulate the behavior of attempting to get an access token with stolen client credentials where the scope is `okta.trustedOrigins.manage` so the actor can add a new cross-origins (CORS) policy and route client authentication through their own server.

```
import requests

okta_domain = "TARGET_DOMAIN"
client_id = "STOLEN_CLIENT_ID"
client_secret = "STOLEN_CLIENT_CREDENTIALS"

# Prepare the request
auth_url = f"{okta_domain}/oauth2/default/v1/token"
auth_data = {
    "grant_type": "client_credentials",
    "scope": "okta.trustedOrigins.manage" 
}
auth_headers = {
    "Accept": "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
    "Authorization": f"Basic {client_id}:{client_secret}"
}
# Make the request
response = requests.post(auth_url, headers=auth_headers, data=auth_data)

# Handle the response
if response.ok:
    token = response.json().get("access_token")
    print(f"Token: {token}")
else:
    print(f"Error: {response.text}")
```

Following this behavior, we formulate a query as such for hunting where we filter out some known client applications like DataDog and Elastic’s Okta integrations.

```
from logs-okta.system*
| where @timestamp > NOW() - 7 day
| where
    event.dataset == "okta.system"

    // filter on failed access token grant requests where source is a public client app
    and event.action == "app.oauth2.as.token.grant"
    and okta.actor.type == "PublicClientApp"
    and okta.outcome.result == "FAILURE"

    // filter out known Elastic and Datadog actors
    and not (
        okta.actor.display_name LIKE "Elastic%"
        or okta.actor.display_name LIKE "Datadog%"
    )

    // filter for scopes that are not implicitly granted
    and okta.outcome.reason == "no_matching_scope"
```

As shown below, we identify matching results and begin to pivot and dive deeper into this investigation, eventually involving incident response (IR) and escalating appropriately. 

![](/assets/images/elevate-your-threat-hunting/image10.png "")

During our after actions report (AAR), we take note of the query that helped identify these compromised credentials and decide to preserve this as a hunting query in our forked Detection Rules repository. It doesn’t quite make sense to create a detection rule based on the fidelity of this and knowing the constant development work we do with custom applications that interact with the Okta APIs, therefore we reserve it as a hunting query.

Creating a new hunting query TOML file in the `hunting/okta/queries` package, we add the following information:

```
author = "EvilC0rp Defenders"
description = """Long Description of Hunt Intentions"""
integration = ["okta"]
uuid = "0b936024-71d9-11ef-a9be-f661ea17fbcc"
name = "Failed OAuth Access Token Retrieval via Public Client App"
language = ["ES|QL"]
license = "Apache License 2.0"
notes = [Array of useful notes from our investigation]
mitre = ['T1550.001']
query = [Our query as shown above]
```

With the file saved we run `python -m hunting generate-markdown FILEPATH` to generate the markdown version of it in `hunting/okta/docs/`.

![](/assets/images/elevate-your-threat-hunting/image1.png "")

Once saved, we can view our new hunting content by using the `view-rule` command or search for it by running the `search` command, specifying Okta as the data source and [T1550.001](https://attack.mitre.org/techniques/T1550/001/) as the subtechnique we are looking for.

![](/assets/images/elevate-your-threat-hunting/image7.png "")

![](/assets/images/elevate-your-threat-hunting/image5.png "")

Last but not least, we can check that the query runs successfully by using the `run-query` command as long as we save a `.detection-rules-cfg-yaml` file with our Elasticsearch authentication details, which will tell us if we have matching results or not.

![](/assets/images/elevate-your-threat-hunting/image8.png "")

Now we can refresh our hunting indexes with the `refresh-index` command and ensure that our markdown file has been created.

![](/assets/images/elevate-your-threat-hunting/image11.png "")

## How We Plan to Expand

Our aim is to continually enhance the Hunting package with additional queries, covering an even wider array of threat scenarios. We will update this resource based on:

* **Emerging Threats**: Developing new queries as new types of cyber threats arise.
* **Community Feedbac**k: Incorporating suggestions and improvements proposed by our community.
* **Fill Gaps Where Traditional alerting Fails**: While we understand the power of our advanced SIEM and EDR, we also understand how some situations favor hunting instead.
* **Longevity and Maintenance**: Our hunting package lives within the very same repository we actively manage our out-of-the-box (OOTB) prebuilt detection rules for the Elastic SIEM. As a result, we plan to routinely add and update our hunting resources.
* **New Features**: Develop new features and commands to aid users with the repository of their hunting efforts.

Our expansion would not be complete without sharing to the rest of the community in an effort to provide value wherever possible. The adoption of these resources or even paradigms surrounding threat scenarios is an important effort by our team to help hunting efforts.

Lastly, we acknowledge and applaud the existing hunting efforts done or in-progress by our industry peers and community. We also acknowledge that maintaining such a package of hunting analytics and/or queries requires consistency and careful planning. Thus this package will receive continued support and additional hunting queries added over time, often aligning with our detection research efforts or community submissions!

## Get Involved

Explore the Hunting resources, utilize the queries and python package, participate in our community discussion forums to share your experiences and contribute to the evolution of this resource. Your feedback is crucial for us to refine and expand our offerings.

* [Detection Rules Community Slack Channel](https://elasticstack.slack.com/archives/C016E72DWDS)
* Hunting “[Getting Started](https://github.com/elastic/detection-rules/tree/main/hunting)” Doc
* [Elastic Security Labs](https://twitter.com/elasticseclabs) on X

## Conclusion

With the expansion of these hunting resources, Elastic reaffirms its commitment to advancing cybersecurity defenses. This resource is designed for both experienced threat hunters and those new to the field, providing the tools needed to detect and mitigate sophisticated cyber threats effectively.

Stay tuned for more updates, and happy hunting! 