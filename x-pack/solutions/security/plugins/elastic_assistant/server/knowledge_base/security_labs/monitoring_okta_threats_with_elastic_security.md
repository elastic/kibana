---
title: "Monitoring Okta threats with Elastic Security"
subtitle: "Setup a detection engineering lab for Okta"
slug: "monitoring-okta-threats-with-elastic-security"
date: "2024-02-23"
description: "This article guides readers through establishing an Okta threat detection lab, emphasizing the importance of securing SaaS platforms like Okta. It details creating a lab environment with the Elastic Stack, integrating SIEM solutions, and Okta."
author:
  - slug: terrance-dejesus
image: "photo-edited-03.png"
category:
  - slug: security-research
---

## Preamble

Welcome to another installment of Okta threat research with Elastic. [Previously](https://www.elastic.co/security-labs/starter-guide-to-understanding-okta), we have published articles exploring Okta’s core services and offerings. This article is dedicated to the practical side of cyber defense - setting up a robust Okta threat detection lab. Our journey will navigate through the intricacies of configuring a lab environment using the Elastic Stack, integrating SIEM solutions, and seamlessly connecting with Okta.

The goal of this article is not just to inform but to empower. Whether you're a seasoned cybersecurity professional or a curious enthusiast, our walkthrough aims to equip you with the knowledge and tools to understand and implement advanced threat detection mechanisms for Okta environments. We believe that hands-on experience is the cornerstone of effective cybersecurity practice, and this guide is crafted to provide you with a practical roadmap to enhance your security posture.

As we embark on this technical expedition, remember that the world of cybersecurity is dynamic and ever-evolving. The methods and strategies discussed here are a reflection of the current landscape and best practices. We encourage you to approach this guide with a mindset of exploration and adaptation, as the techniques and tools in cybersecurity are continually advancing.

So, let's dive into our detection lab setup for Okta research.

## Prerequisites

For starters, an Okta license (a [trial license](https://www.okta.com/free-trial/) is fine) is required for this lab setup. This will at least allow us to generate Okta system logs within our environment, which we can then ingest into our Elastic Stack.

Secondarily, after Okta is set up, we can deploy a Windows Server, set up Active Directory (AD), and use the [AD integration](https://help.okta.com/en-us/content/topics/directory/ad-agent-main.htm) in Okta to sync AD with Okta for Identity and Access Management (IAM). This step is not necessary for the rest of the lab, however, it can help extend our lab for other exercises and scenarios where endpoint and Okta data are both necessary for hunting.

## Sign up for Okta Workforce Identity

We will set up a fresh Okta environment for this walkthrough by signing up for a Workforce Identity Cloud trial. If you already have an Okta setup in your environment, then feel free to skip to the `Setting Up the Elastic Stack` section.

Once signed up for the trial, you are typically presented with a URL containing a trial license subdomain and the email to log into the Okta admin console.

To start, users must pivot over to the email they provided when signing up and follow the instructions of the activation email by Okta, which contains a QR code to scan. 

The QR code is linked to the Okta Verify application that is available on mobile devices, iOS and Android. A prompt on the mobile device for multi-factor authentication (MFA) using a phone number and face recognition is requested. 

![Setting up Okta Verify through a mobile device](/assets/images/monitoring-okta-threats-with-elastic-security/image23.png)

_Image 1: Setting up Okta Verify through a mobile device_

Once set up, we are redirected to the Okta admin console to configure MFA using Okta Verify.

![The Okta Admin console](/assets/images/monitoring-okta-threats-with-elastic-security/image9.png)

_Image 2: The Okta Admin console_

At this point, you should have a trial license for Okta, have setup MFA, and have access to the Okta admin console.

## Setting up your free cloud stack

For this lab, we will use a [free trial](https://cloud.elastic.co/registration) of an Elastic Cloud instance. You also have the option to create the stack in [Amazon Web Services](https://www.elastic.co/partners/aws?utm_campaign=Comp-Stack-Trials-AWSElasticsearch-AMER-NA-Exact&utm_content=Elasticsearch-AWS&utm_source=adwords-s&utm_medium=paid&device=c&utm_term=amazon%20elk&gclid=Cj0KCQiA1ZGcBhCoARIsAGQ0kkqI9gFWLvEX--Fq9eE8WMb43C9DsMg_lRI5ov_3DL4vg3Q4ViUKg-saAsgxEALw_wcB) (AWS), [GCP](https://www.elastic.co/guide/en/cloud/current/ec-billing-gcp.html), or Microsoft Azure if you’d like to set up your stack in an existing cloud service provider (CSP). Ensure you [enable MFA for your Elastic Cloud environment](https://www.elastic.co/guide/en/cloud/current/ec-account-user-settings.html#ec-account-security-mfa).

Once registered for the free trial, we can focus on configuring the Elastic Stack deployment. For this lab, we will call our deployment okta-threat-detection and deploy it in GCP. It is fine to leave the default settings for your deployment, and we recommend the latest version for all the latest features. For the purposes of this demo, we use the following:

 - Name: okta-threat-detection
 - Cloud provider: Google Cloud
 - Region: Iowa (us-central1)
 - Hardware profile: Storage optimized
 - Version: 8.12.0 (latest)

The option to adjust additional settings for Elasticsearch, Kibana, Integrations, and more is configurable during this step. However, default settings are fine for this lab exercise. If you choose to leverage the Elastic Stack for a more permanent, long-term strategy, we recommend planning and designing architecturally according to your needs.

Once set, select “Create deployment” and the Elastic Stack will automatically be deployed in GCP (or whatever cloud provider you selected). You can download the displayed credentials as a CSV file or save them wherever you see fit. The deployment takes approximately 5 minutes to complete and once finished, you can select “Continue” to log in. Congratulations, you have successfully deployed the Elastic Stack within minutes!

![Your newly deployed Elastic stack](/assets/images/monitoring-okta-threats-with-elastic-security/image14.png)

_Image 3: Your newly deployed Elastic stack_

## Setup Fleet from the Security Solution

As a reminder, [Fleet](https://www.elastic.co/guide/en/fleet/current/fleet-overview.html) enables the creation and management of an agent policy, which will incorporate the [Okta integration](https://docs.elastic.co/en/integrations/okta) on an Elastic Agent. This integration is used to access and ingest Okta logs into our stack.

### Create an Okta policy

For our Elastic Agent to know which integration it is using, what data to gather, and where to stream that data within our stack, we must first set up a custom Fleet policy we’re naming Okta.

To set up a fleet policy within your Elastic Stack, do the following in your Elastic Stack:

 1. Navigation menu > Management > Fleet > Agent Policies > Create agent policy
 2. Enter “Okta” as a name > Create Agent Policy

![Fleet agent policies page in Elastic Stack](/assets/images/monitoring-okta-threats-with-elastic-security/image19.png)

_Image 4: Fleet agent policies page in Elastic Stack_

## Setup the Okta integration

Once our policy is established, we need to install the Okta integration for the Elastic Stack we just deployed.

By selecting the “Okta” name in the agent policies that was just created, we need to add the Okta integration by selecting “Add integration” as shown below.

![The Okta integration within the agent policies](/assets/images/monitoring-okta-threats-with-elastic-security/image17.png)

_Image 5: The Okta integration within the agent policies_

Typing “Okta” into the search bar will show the Okta integration that needs to be added. Select this integration and the following prompt should appear.

![The Okta Integration page](/assets/images/monitoring-okta-threats-with-elastic-security/image22.png)

_Image 6: The Okta Integration page_

By selecting “Add Okta” we can now begin to set up the integration with a simple step-by-step process, complimentary to adding our first integration in the Elastic Stack.

![Adding integrations into the Elastic Stack](/assets/images/monitoring-okta-threats-with-elastic-security/image7.png)

_Image 7: Adding integrations into the Elastic Stack_

## Install the Elastic Agent on an endpoint

As previously mentioned, we have to install at least one agent on an endpoint to access data in Okta, associated with the configured Okta policy. We recommend a lightweight Linux host, either as a VM locally or in a CSP such as GCP, to keep everything in the same environment. For this publication, I will use a VM instance of [Ubuntu 20.04 LTS](https://releases.ubuntu.com/focal/) VM in Google’s Compute Engine (GCE). Your endpoint can be lightweight, such as GCP N1 or E2 series, as its sole purpose is to run the Elastic Agent.

Select the “Install Elastic Agent” button and select which host the agent will be installed on. For this example, we will be using a Linux host. Once selected, a “Copy” option is available to copy and paste the commands into your Linux console, followed by execution.

![Install Elastic Agent](/assets/images/monitoring-okta-threats-with-elastic-security/image24.png)

_Image 8: Install Elastic Agent_

## Create an Okta token
At this point, we need an API key and an Okta system logs API URL for the integration setup. Thus, we must pivot to the Okta admin console to create the API token.

![Access the Okta Admin console](/assets/images/monitoring-okta-threats-with-elastic-security/image5.png)

_Image 9: Access the Okta Admin console_

From the Okta admin console, select the following:

 1. Security > API > Tokens
 2. Select the “Create token” button

In this instance, we name the API token “elastic”. Since my administrator account creates the token, it inherits the permissions and privileges of my account. In general, we recommend creating a separate user and scoping permissions properly with principle-of-least-privilege (PoLP) for best security practices. I recommend copying the provided API token key to the clipboard, as it is necessary for the Okta integration setup.

![Copy your API token](/assets/images/monitoring-okta-threats-with-elastic-security/image16.png)

_Image 10: Copy your API token_

We also need to capture the Okta API Logs URL, which is our HTTPS URL with the URI ```/api/v1/logs``` or system logs API endpoint.

For example: ```https://{okta-subdomain}.okta.com/api/v1/logs```

The Elastic Agent, using the Okta integration, will send requests to this API URL with our API token included in the authorization header of the requests as a Single Sign-On for Web Systems (SSWS) token. With this information, we are ready to finalize our Okta integration setup in the Elastic Stack.

## Add Okta integration requirements

Pivoting back to the Okta integration setup in the Elastic Stack, it requires us to add the API token and the Okta System logs API URL as shown below. Aside from this, we change the “Initial Interval” from 24 hours to 2 minutes. This will help check for Okta logs immediately after we finish our setup.

![Configure log collection](/assets/images/monitoring-okta-threats-with-elastic-security/image12.png)

_Image 11: Configure log collection_

Once this information is submitted to the Okta integration setup, we can select the “Confirm incoming data” button to verify that logs are properly being ingested from the Elastic Agent.

![Preview data from Okta](/assets/images/monitoring-okta-threats-with-elastic-security/image11.png)

_Image 12: Preview data from Okta_

While we have confirmed that data is in fact being ingested from the Elastic Agent, we must also confirm that we have Okta-specific logs being ingested. I would suggest that you take a moment to pivot back to Okta and change some settings in the admin console. This will then generate Okta system logs that will eventually be extracted by our Elastic Agent and ingested into our Elastic Stack. Once completed, we can leverage the Discover feature within Kibana to search for the Okta system logs that should have been generated.

The following query can help us accomplish this - ```event.dataset:okta*```

![Use Discover to explore your Okta data](/assets/images/monitoring-okta-threats-with-elastic-security/image13.png)

_Image 13: Use Discover to explore your Okta data_

If you have managed to find Okta logs from this, then congratulations rockstar, you have successfully completed these steps:

 1. Signed up for Okta Workforce Identity with a trial license
 2. Deployed a trial Elastic stack via cloud.elastic.co
 3. Deployed an agent to your host of choice
 4. Created an Okta policy
 5. Setup the Okta integration
 6. Created an Okta API token
 7. Confirmed incoming data from our Elastic agent

## Enable Okta detection rules

Elastic has 1000+ pre-built detection rules not only for Windows, Linux, and macOS endpoints, but also for several integrations, including Okta. You can view our current existing Okta [rules](https://github.com/elastic/detection-rules/tree/main/rules/integrations/okta) and corresponding MITRE ATT&CK [coverage](https://mitre-attack.github.io/attack-navigator/#layerURL=https%3A%2F%2Fgist.githubusercontent.com%2Fbrokensound77%2F1a3f65224822a30a8228a8ed20289a89%2Fraw%2FElastic-detection-rules-indexes-logs-oktaWILDCARD.json&leave_site_dialog=false&tabs=false).

To enable Okta rules, complete the following in the Elastic Stack:

 1. Navigation menu > Security > Manage > Rules
 2. Select “Load Elastic prebuilt rules and timeline templates”
 3. Once all rules are loaded:
   a. Select “Tags” dropdown
   b. Search “Okta”
   c. Select all rules > Build actions dropdown > Enable

![Searching for Out-of-the-Box (OOB) Okta Detection Rules](/assets/images/monitoring-okta-threats-with-elastic-security/image15.png)

_Image 14: Searching for Out-of-the-Box (OOB) Okta Detection Rules_

While we won’t go in-depth about exploring all rule information, we recommend [doing so](https://www.elastic.co/guide/en/security/current/detection-engine-overview.html). Elastic has additional information, such as related integrations, investigation guides, and much more! Also, you can add to our community by [creating your own](https://www.elastic.co/guide/en/security/current/rules-ui-create.html) detection rule with the “Create new rule” button and [contribute](https://github.com/elastic/detection-rules#how-to-contribute) it to our detection rules repository.

## Let’s trigger a pre-built rule

After all Okta rules have been enabled, we can now move on to testing alerts for these rules with some simple emulation.

For this example, let’s use the [Attempt to Reset MFA Factors for an Okta User Account](https://github.com/elastic/detection-rules/blob/main/rules/integrations/okta/persistence_attempt_to_reset_mfa_factors_for_okta_user_account.toml) detection rule that comes fresh out-of-the-box (OOB) with prebuilt detection rules.

![Enabling an OOB Okta detection rule to test alerting](/assets/images/monitoring-okta-threats-with-elastic-security/image15.png)

_Image 15: Enabling an OOB Okta detection rule to test alerting_

To trigger, we simply log into our Okta admin console and select a user of choice from Directory > People and then More Actions > Reset Multifactor > Reset All.

![Resetting MFA for a user in Okta](/assets/images/monitoring-okta-threats-with-elastic-security/image18.png)

_Image 16: Resetting MFA for a user in Okta_

Once complete, logs will be ingested shortly into the Elastic Stack, and the Detection Engine will run the rule’s query against datastreams whose patterns match ```logs-okta*```. If all goes as expected, an alert should be available via the Security > Alerts page in the Elastic stack.

![Alert page flyout for triggered OOB Okta detection rule](/assets/images/monitoring-okta-threats-with-elastic-security/image1.png)

_Image 17: Alert page flyout for triggered OOB Okta detection rule_

## Let’s trigger a custom rule

It is expected that not all OOTB Okta rules may be right for your environment or detection lab. As a result, you may want to create custom detection rules for data from the Okta integration.  Allow me to demonstrate how you would do this.

Let’s assume we have a use case where we want to identify when a unique user ID (Okta Actor ID) has an established session from two separate devices, indicating a potential web session hijack.

For this, we will rely on Elastic’s piped query language, [ES|QL](https://www.elastic.co/blog/getting-started-elasticsearch-query-language). We can start by navigating to Security > Detection Rules (SIEM) > Create new rules. We can then select ES|QL as the rule type.

![Create new rule Kibana page in Elastic security solution](/assets/images/monitoring-okta-threats-with-elastic-security/image2.png)

_Image 18: Create new rule Kibana page in Elastic security solution_

To re-create Okta system logs for this event, we would log in to Okta with the same account from multiple devices relatively quickly. For replication, I have done so via macOS and Windows endpoints, as well as my mobile phone, for variety.

The following custom ES|QL query would identify this activity, which we can confirm via Discover in the Elastic Stack before adding it to our new rule.

![Testing ES|QL query in Elastic Discover prior to rule implementation](/assets/images/monitoring-okta-threats-with-elastic-security/image6.png)

_Image 19: Testing ES|QL query in Elastic Discover prior to rule implementation_

Now that we have adjusted and tested our query and are happy with the results, we can set it as the query for our new rule.

![Creating new custom detection rule with ES|QL query logic](/assets/images/monitoring-okta-threats-with-elastic-security/image21.png)

_Image 20: Creating new custom detection rule with ES|QL query logic_

![Enabled custom detection rule with ES|QL query for Okta threat](/assets/images/monitoring-okta-threats-with-elastic-security/image8.png)

_Image 21: Enabled custom detection rule with ES|QL query for Okta threat_

Now that our rule has been created, tested, and enabled, let’s attempt to fire an alert by replicating this activity. For this, we simply log into our Okta admin console from the same device with multiple user accounts.

As we can see, we now have an alert for this custom rule!

![Triggered alert for events matching custom detection rule](/assets/images/monitoring-okta-threats-with-elastic-security/image4.png)

_Image 22: Triggered alert for events matching custom detection rule_

## Bonus: synchronize Active Directory (AD)

As discussed in our [previous Okta installation](https://www.elastic.co/security-labs/starter-guide-to-understanding-okta), a core service offering in Okta is to synchronize with third-party IAM directory services such as AD, Google Workspace, and others. Doing so in your lab can enable further threat detection capabilities as cross-correlation between Windows logs and Okta for users would be possible. For this article, we will step through synchronizing with AD on a local Windows Server. Note - We recommend deploying a Windows Elastic Agent to your Windows Server and setting up the [Windows](https://docs.elastic.co/en/integrations/windows) and [Elastic Defend](https://www.elastic.co/guide/en/security/current/install-endpoint.html) integrations for additional log ingestion.

 1. [Setup](https://www.linkedin.com/pulse/how-install-active-directory-domain-services-windows-server-2019-/) your Windows Server (we are using WinServer 2019)
 2. Deploy the Okta AD agent from your Okta admin console
   a. Directory > Directory Integrations
   b. Add Directory > Add Active Directory
 3. Walk through guided steps to install Okta AD agent on Windows Server
   a. Execution of the Okta Agent executable will require a setup on the Windows Server side as well
 4. Confirm Okta AD agent was successfully deployed
 5. Synchronize AD with Okta
   a. Directory > Directory Integrations
   b. Select new AD integration
   c. elect “Import Now”
Choose incremental or full import
 6. Select which users and groups to import and import them

![Successful Okta agent deployment and synchronization with AD](/assets/images/monitoring-okta-threats-with-elastic-security/image10.png)

_Image 23: Successful Okta agent deployment and synchronization with AD_

Once finished, under Directory in the Okta admin console, you should see people and groups that have been successfully imported. From here, you can emulate attack scenarios such as stolen login credentials locally (Windows host) being used to reset MFA in Okta.

## Additional considerations

While this is a basic setup of not only the Elastic Stack, Okta integration, and more for a threat research lab, there are additional considerations for our setup that are dependent on our research goals. While we won't dive into specifics nor exhaust possible scenarios, below is a list of considerations for your lab to accurately emulate an enterprise environment and/or adversary playbooks:

 - Is Okta my IdP source of truth? If not, set up a third party such as Azure AD (AAD) or Google Workspace and synchronize directory services.
 - Will I simulate adversary behavior - for example, SAMLjacking? If so, what third-party integrations do I need that leverage SAML for authentication?
 - Do I want to research tenant poisoning? If so, should I set up a multi-tenant architecture with Okta?
 - Do I need separate software, such as VPNs or proxies, to emulate attribution evasion when attempting to bypass MFA?
 - What other tools, such as EvilGinx, let me attempt phishing playbooks, and what is the required set up in Okta for these exercises?
 - How should I capture authorization codes during OAuth workflows, and how can I replay an exchange request for an access token?
 - For password spraying or credential stuffing, which third-party applications should I integrate, and how many should suffice for accurate detection logic?
 - How might I explore lax access policies for user profiles?

## Takeaways

In this guide, we've successfully navigated the setup of an Okta threat detection lab using the Elastic Stack, highlighting the importance of safeguarding SaaS platforms like Okta. Our journey included deploying the Elastic Stack, integrating and testing Okta system logs, and implementing both pre-built and custom detection rules.

The key takeaway is the Elastic Stack's versatility in threat detection, accommodating various scenarios, and enhancing cybersecurity capabilities. This walkthrough demonstrates that effective threat management in Okta environments is both achievable and essential.

As we wrap up, remember that the true value of this exercise lies in its practical application. By establishing your own detection lab, you're not only reinforcing your security posture but also contributing to the broader cybersecurity community. Stay tuned for additional threat research content surrounding SaaS and Okta, where we'll explore common adversary attacks against Okta environments and detection strategies.

