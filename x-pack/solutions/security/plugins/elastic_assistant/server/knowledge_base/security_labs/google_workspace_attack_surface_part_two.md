---
title: "Google Workspace Attack Surface"
slug: "google-workspace-attack-surface-part-two"
date: "2023-01-03"
subtitle: "Part Two: Setup Threat Detection With Elastic"
description: "During part two of this multipart series, we’ll help you understand how to setup a GW lab for threat detection and research."
author:
  - slug: terrance-dejesus
image: "photo-edited-01-e.jpg"
category:
tags:
  - threat detection
  - cloud security
  - google workspace
  - google cloud
---

# Preamble

As a continuation of this series about Google Workspace’s (GW) attack surface, we diverge from surveying the land and focus on setting up a threat detection lab with Elastic. In [part one](https://www.elastic.co/security-labs/google-workspace-attack-surface-part-one), we explored the important resources and capabilities of GW, while tracking intrusion techniques that adversaries may leverage. In part two, we will give you the foundation needed to begin researching threats targeting GW, and provide resources for detecting those threats using Elastic technologies. The information used during the steps provided should be adjusted for your own lab and testing environment. If you do not feel the need to set up your own lab, that’s fine as this includes examples showing you how we detect threats to GW.

Following this will be part three of this series, in which we cover common intrusion techniques by emulating the GW environment and simulating threat activity. In doing so, we’ll build detection logic to further detect several common techniques.

Elastic resources will be freely available but a registered domain for GW is necessary and will be covered in the upcoming steps, strictly for maximum authenticity. Approximate lab setup time is 20-30 minutes.

## Let’s Get You Up to Speed

For those who may not be familiar with Elastic’s current stack: take a few minutes to review the current [solutions](https://www.elastic.co/blog/category/solutions) it offers. In short, the stack is an all-encompassing product that can be deployed anywhere from a single interface! If you would like to explore more information about the Elastic security solution, the [documentation](https://www.elastic.co/guide/en/security/current/getting-started.html) is a great starting point.

In this article, we will focus specifically on the security solution which includes a robust detection engine and 600+ pre-built threat [detection rules,](https://github.com/elastic/detection-rules/tree/main/rules) an endpoint agent that can be deployed to Windows, Linux, or macOS endpoints and collect data from various on-premise and cloud environments, as well as detect and prevent threats in real-time. Not to mention, this endpoint behavior logic is also all public in our [protections artifacts](https://github.com/elastic/protections-artifacts) repository.

Our endpoint agent orchestrator, [Fleet](https://www.elastic.co/guide/en/fleet/current/fleet-overview.html), is manageable from the Kibana interface in the Elastic Stack. Fleet allows us to set up and deploy security policies to our endpoint agents. These policies are extremely customizable, thanks to an extensive list of supported [Integrations](https://www.elastic.co/integrations/).

Think of an Integration as a module for the Elastic Agent that provides processors to collect specific data. When added to our security policy, an Integration allows the Elastic Agent to ingest logs, apply our Elastic Common Schema (ECS), and store them in the Elastic Stack for searching or to trigger alerts. If you're curious about a specific integration Elastic has, you can search for it [here](https://www.elastic.co/integrations/data-integrations)!

With this information you could almost assume the Elastic Stack allows you to manage all of this with just one information technology (IT) guy.

![](/assets/images/google-workspace-attack-surface-part-two/ned.jpeg)

Either way, our goal is to create a threat detection lab for [Google Workspace](https://docs.elastic.co/en/integrations/google_workspace) as depicted in this diagram:

![Simple architecture layout and process workflow](/assets/images/google-workspace-attack-surface-part-two/image14.png)

The process of setting this up is pretty straightforward. Note that your environment does not have to be cloud-focused; if you prefer to do everything locally, you are more than welcome to. The [Elastic Container Project](https://www.elastic.co/security-labs/the-elastic-container-project) is a great resource for a local Docker build of the stack.

## Sign-Up for Google Workspace

In order for you to use GW, you must have a registered Google account email address and organization. If you already have a GW setup for an organization, login to the [admin console](https://admin.google.com/) and continue to Create a Project in Google Cloud. This process will not go into detail about creating a Google account.

Once created, do the following:

1. Visit [https://workspace.google.com](https://workspace.google.com) \> Get Started
2. Fill out the information requested in subsequent steps
3. Business name: DeJesus’ Archeology
4. Number of employees: 2-9
5. Region: United States

For this lab, we will use DeJesus’ Archeology as a business name because it's memorable (also who didn't want to be an archeologist growing up?). We'll be digging up more recent evidence in these logs than we would from the earth, of course.

Eventually you will be asked, “Does your business have a domain?”. GW requires you to have your own domain name to use its services, especially the admin console for an organization. For today, we will select “No, I need one” and will use dejesusarcheology.com, but please select or use your own. From here, you will need to enter additional business information to register your domain and organization.

You will need a username to sign into your GW account and create your business email address. We'll use [terrance@dejesusarcheology.com](mailto:terrance@dejesusarcheology.com) as the administrative email. When finished, continue to login to your GW admin console with your new email where you should be greeted by a similar interface below.

![Default page for GW admin console after login](/assets/images/google-workspace-attack-surface-part-two/image25.jpg)

## Setup Google Cloud Platform (GCP)

For the Elastic agent to ingest GW logs, it relies solely on making requests to the [Reports API](https://developers.google.com/admin-sdk/reports/reference/rest) and therefore, we need to leverage GCP for a managed service account. This service account’s credentials will be used by our Elastic agent to then leverage the admin SDK API for pulling logs from GW’s Reports API into the Elastic Stack. Domain-wide delegation and OAuth2 are important for authentication and resource access but will be enabled through steps later on.

### Create a Project

GCP is hierarchical, so we must first create a project. If you already have a GCP environment setup, we recommend creating a new project that links to your GW via the registered domain by following similar steps below.

Complete the following steps:

1. Log into [Google Cloud](https://console.cloud.google.com/)with the same Google account used to setup GW
2. Select the following: Select a project \> New Project
3. Enter the following information described in subsequent steps
4. Project name: dejesus-archeology
5. Organization: dejesusarcheology.com
6. Location: dejesusarcheology.com

When done, you should have a new organization and project in GCP. By default, only the creator of the project has rights to manage the project.

![Project dashboard in Google Cloud](/assets/images/google-workspace-attack-surface-part-two/image19.jpg)

### Enable Admin SDK API

Our Elastic agent will eventually use our GCP service account, which uses the [Workspace Admin SDK](https://developers.google.com/admin-sdk) to interact with the GW admin console REST API, therefore it needs to be enabled in GCP. To keep your mind at ease, we will only be enabling read access to the Reports API for this admin SDK.

Complete the following steps:

- Select the Google Cloud navigation menu \> APIs & Services \> Enabled APIs & Services
- Search and enable “Admin SDK API” from the API library page

When finished, you will have enabled the Admin SDK API within your project, where your service account will have access to pull data from GW.

![Admin SDK API enabled in GCP](/assets/images/google-workspace-attack-surface-part-two/image23.jpg)

### Configure OAuth Consent Screen

We next need to set up the [OAuth consent screen](https://developers.google.com/workspace/guides/configure-oauth-consent) for our service account and application when they create API requests to GW, as it will include the necessary authorization token.

Complete the following steps:

1. Select the Google Cloud navigation menu \> APIs & Services \> Enabled APIs & Services \> OAuth Consent Screen
2. User Type \> Internal \> Create
3. Fill out the following information in subsequent steps
4. App name: elastic-agent
5. User support email: [terrance@dejesusarcheology.com](mailto:terrance@dejesusarcheology.com)
6. Authorized domains: dejesusarcheology.com
7. Developer contact information: [terrance@dejesusarcheology.com](mailto:terrance@dejesusarcheology.com)
8. Save and Continue
9. Save and Continue
10. Back to Dashboard

![OAuth consent screen setup for application in GCP](/assets/images/google-workspace-attack-surface-part-two/image7.jpg)

When finished, we will now have a registered application using OAuth 2.0 for authorization and the consent screen information set. Please note, the default token request limit for this app daily is 10,000 but can be increased. We recommend setting your Elastic agent’s pull rate to every 10 minutes which should not come close to this reaching this threshold. Setting the agent’s pull rate will be done at a later step.

### Create a Service Account

For the Elastic agent to ingest data from GW, we will need to create a [service account](https://cloud.google.com/iam/docs/service-accounts) for the agent to use. This account is meant for non-human applications, allowing it to access resources in GW via the Admin SDK API we enabled earlier.

To create a service account, do the following:

1. Select the navigation menu in Google Cloud \> APIs & Services \> Credentials \> Create Credentials \> Service Account
2. Enter the following information:
3. Service account name: elastic-agent
4. Service account ID: elastic-agent
5. Leave the rest blank and continue
6. Select your new Service Account \> Keys \> Add Key \> Create New Key \> JSON

By default, the Owner role will be applied to this service account based on inheritance from the project, feel free to scope permissions tighter as best seen fit. When finished, you should have a service account named elastic-agent, credentials for this service account in a JSON file saved to your host. We will enter this information during our Fleet policy integration setup.

![Service account creation in GCP](/assets/images/google-workspace-attack-surface-part-two/image8.jpg)

### Enable Domain-Wide Delegation

Our service account will need [domain-wide delegation](https://developers.google.com/admin-sdk/directory/v1/guides/delegation) of permissions to access APIs that reach outside of GCP and into GW. The important data necessary for this has already been established in earlier steps where we need an API key, service account and OAuth client ID.

To enable domain-wide delegation for your service account, do the following:

1. In your GW Admin Console select \> Navigation Menu \> Security \> Access and data control \> API controls
2. Select Manage Domain Wide Delegation \> Add New
3. Client ID: OAuth ID from Service Account in GCP
4. Google Cloud Console \> IAM & Admin \> Service Accounts \> OAuth 2 Client ID (copy to clipboard)
5. OAuth Scopes: [https://www.googleapis.com/auth/admin.reports.audit.readonly](https://www.googleapis.com/auth/admin.reports.audit.readonly)

![Domain-wide Delegation enabled in Google Workspace](/assets/images/google-workspace-attack-surface-part-two/image4.jpg)

Our service account in GCP only needs access to admin.reports.audit.readonly to access GW [Audit Reports](https://developers.google.com/admin-sdk/reports/v1/get-start/overview) where these are converted into ECS documents for our Elastic Stack.

If you made it this far, CONGRATULATIONS you are doing outstanding! Your GW and GCP environments are now set up and finished. At this point you are almost done, we just need to set up the Elastic Stack.

## Setting Up Your Free Cloud Stack

For this lab, we will use a [free trial](https://cloud.elastic.co/registration)of cloud elastic with your preference of a Google or Microsoft email account. You also have the option to create the stack in [Amazon Web Services](https://www.elastic.co/partners/aws?utm_campaign=Comp-Stack-Trials-AWSElasticsearch-AMER-NA-Exact&utm_content=Elasticsearch-AWS&utm_source=adwords-s&utm_medium=paid&device=c&utm_term=amazon%20elk&gclid=Cj0KCQiA1ZGcBhCoARIsAGQ0kkqI9gFWLvEX--Fq9eE8WMb43C9DsMg_lRI5ov_3DL4vg3Q4ViUKg-saAsgxEALw_wcB) (AWS), [GCP](https://www.elastic.co/guide/en/cloud/current/ec-billing-gcp.html) or [Microsoft Azure](https://www.elastic.co/partners/microsoft-azure) if you’d like to stand up your stack in an existing Cloud Service Provider (CSP). The free trial will deploy the stack to GCP.

Once registered for the free trial, we can focus on configuring the Elastic Stack deployment. For this lab, we will call our deployment gw-threat-detection and deploy it in GCP. It is fine to leave the default settings for your deployment and we recommend the latest version for all the latest features. For the purposes of this demo, we use the following:

- Name: gw-threat-detection
- Cloud provider: Google Cloud
- Region: Iowa (us-central1)
- Hardware profile: Storage optimized
- Version: 8.4.1 (latest)

Once set, select “Create deployment” and the Elastic Stack will automatically be deployed in GCP where your deployment credentials will be displayed. You can download these credentials as a CSV file or save them wherever you best see fit, but they are crucial to logging into your deployed stack. The deployment takes approximately ~5 minutes to complete and once finished you can select “continue” to login. Congratulations, you have successfully deployed the Elastic Stack within minutes!

![Default page after logging into deployed Elastic Stack](/assets/images/google-workspace-attack-surface-part-two/image9.jpg)

## Setup Fleet from the Security Solution

As a reminder, [Fleet](https://www.elastic.co/guide/en/fleet/current/fleet-overview.html) enables the creation of a security policy, which can incorporate the [GW integration](https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-module-google_workspace.html)on an elastic-agent, in order to access and ingest GW logs into our stack.

### Create a Google Workspace Policy

In order for our Elastic Agent to know which integration it is using, what data to gather and where to stream that data within our stack, we must first set up a custom Fleet policy, named Google Workspace.

To setup a fleet policy within your Elastic Stack, do the following in your Elastic Stack:

- Navigation menu \> Management \> Fleet \> Agent Policies \> Create agent policy
- Enter “Google Workspace” as a name \> Create Agent Policy

![Fleet agent policies page in Elastic Stack](/assets/images/google-workspace-attack-surface-part-two/image6.jpg)

### Install the Elastic agent on an Endpoint

As previously mentioned, we have to install at least one agent on an endpoint to access data in GW, and will be subject to the deployed GW policy. We recommend a lightweight Linux host, either as a VM locally or in a CSP such as GCP to keep everything in the same environment. I will be using a VM instance of [Ubuntu 20.04 LTS](https://releases.ubuntu.com/focal/) VM in Google’s Compute Engine (GCE) of the same GCP project we have been working on. Your endpoint can be lightweight, such as GCP N1 or E2 series, as its sole purpose is to run the Elastic agent.

After your endpoint is setup, do the following in your Elastic Stack to deploy your the agent:

1. Navigation menu \> Management \> Fleet \> Agents \> Add Agent
2. Ensure the GW policy is selected
3. Select the appropriate OS
4. Select the clipboard icon to copy the commands
5. Run the commands on your endpoint to install the agent
6. Once finished, Fleet should show a checkmark and state 1 agent has been enrolled and Incoming data confirmed

![Installed Elastic agent on Linux endpoint and Fleet status page in Elastic Stack](/assets/images/google-workspace-attack-surface-part-two/image24.png)

### Assign Google Workspace Integration to Fleet Policy

We must add the GW integration to our GW policy in order for it to collect data from GW and stream it to our Elastic Stack. We will configure the GW integration settings to have information created when we set up our GW environment to avoid having [unsecured credentials](https://attack.mitre.org/techniques/T1552/) on our Ubuntu host.

⚠️ The GW integration has a default interval of 2 hours, meaning the Elastic agent will retrieve data every 2 hours due to potential [data retention and lag times](https://support.google.com/a/answer/7061566?hl=en). This should be adjusted in the integration itself and is accounted for in the following steps within your Elastic Stack:

1. Navigation menu \> Fleet \> Agent Policies \> Google Workspace \> Add Integration
2. Search for “Google Workspace” \> Select Google Workspace
3. Select “Add Google Workspace”
4. Enter the following information for this integration:
5. Integration name: google workspace
6. Jwt File: Copy contents of JSON file from service account creation steps
7. Delegated Account: [terrance@dejesusarcheology.com](mailto:terrance@dejesusarcheology.com) (Use your own)
8. Interval: 10m
9. Agent policy: Google Workspace
10. Select “Save and Continue”
11. Select “Save and deploy changes”

Once completed, your GW integration should be assigned to your GW policy with one agent assigned this policy.

![Google Workspace integration enabled in Fleet policy in Elastic Stack](/assets/images/google-workspace-attack-surface-part-two/image18.jpg)

To recap on our Elastic Stack setup so far we have completed the following:

- Deployed an Elastic Stack
- Created a Fleet policy
- Setup a lightweight Linux endpoint
- Deployed an Elastic agent to the Linux endpoint
- Enabled the Google Workspace integration inside our Fleet policy

### Assign Google Workspace Integration to Fleet Policy

Rather than rely on the detection engineering (DE) higher powers, let’s take a second to actually confirm GW data is being ingested into our stack as expected at this point. We can rely on the Discovery feature of the Elastic Stack which allows us to search specific criteria across existing ECS documents. For this, we will use the filter criteria `data_stream.dataset : "google_workspace.*"` to look for any ECS documents that originate from a Google Workspace datastream.

![Search results for Google Workspace ECS documents in Elastic Stack via Discover](/assets/images/google-workspace-attack-surface-part-two/image1.png)

If you do not have any results, generate some activity within your GW such as creating new users, enabling email routes, creating new Organizational Units (OU) and so forth, then refresh this query after the 10 minute window has surpassed.

![](/assets/images/google-workspace-attack-surface-part-two/image5.gif)

If results are found, congratulations are in order because you now have a fully functional threat detection lab for Google Workspace with the Elastic Security for SIEM!

## Enable Google Workspace Detection Rules

As stated earlier, Elastic has 600+ pre-built detection [rules](https://github.com/elastic/detection-rules/tree/main/rules/integrations/google_workspace) not only for Windows, Linux and MacOS endpoints, as well as several integrations including GW. You can view our current existing GW rules and MITRE ATT&CK [coverage](https://mitre-attack.github.io/attack-navigator/#layerURL=https%3A%2F%2Fgist.githubusercontent.com%2Fbrokensound77%2F1a3f65224822a30a8228a8ed20289a89%2Fraw%2FElastic-detection-rules-indexes-logs-google_workspaceWILDCARD.json&leave_site_dialog=false&tabs=false).

To enable GW rules, complete the following in the Elastic Stack:

1. Navigation menu \> Security \> Manage \> Rules
2. Select “Load Elastic prebuilt rules and timeline templates”
3. Once all rules are loaded:
4. Select “Tags” dropdown
5. Search “Google Workspace”
6. Select all rules \> Build actions dropdown \> Enable

![Enabled pre-built detection rules where tag is Google Workspace in Elastic Stack](/assets/images/google-workspace-attack-surface-part-two/image21.png)

While we won’t go in-depth about exploring all rule information, we recommend doing so. Elastic has some additional information such as related integrations, investigation guides and more! Also, you can contribute back to the community by [creating your own detection rule](https://www.elastic.co/guide/en/security/current/rules-ui-create.html) with the “Create new rule” button, and [contribute](https://github.com/elastic/detection-rules#how-to-contribute) to our detection rules repository.

## Let’s Trigger a Pre-Built Rule

For this example, we will provoke the [Google Workspace Custom Admin Role Created](https://github.com/elastic/detection-rules/blob/main/rules/integrations/google_workspace/persistence_google_workspace_custom_admin_role_created.toml) detection rule. In our GW admin console, visit Account \> Admin roles and create a new role with the following information:

1. Name: Curator
2. Description: Your Choice
3. Admin console privileges:
4. Alert Center: Full Access

![Create an admin role in Google Workspace admin console](/assets/images/google-workspace-attack-surface-part-two/image16.jpg)

Now, we aren’t entirely sure why the Curator role would have access to our Alert Center, but the role seems either improperly scoped or someone wants to have the ability to potentially silence some alerts before our security team can investigate them. While the creation of administrative accounts ([T1136.003](https://attack.mitre.org/techniques/T1136/003/)) is not unusual, they should always be investigated if unexpected to ensure cloud roles ([T1098.003](https://attack.mitre.org/techniques/T1098/003/)) are properly scoped.

To view our detection alert, in your Elastic Stack, visit Navigation Menu \> Security \> Alerts and the following should show your alerts. From this, we can see that our rule triggered as well as [Google Workspace API Access Granted via Domain-Wide Delegation of Authority](https://github.com/elastic/detection-rules/blob/main/rules/integrations/google_workspace/persistence_google_workspace_api_access_granted_via_domain_wide_delegation_of_authority.toml).

![Elastic Stack security alerts page displaying triggered alerts](/assets/images/google-workspace-attack-surface-part-two/image26.jpg)

If we select “View details” from the actions column, we receive a pop-out panel showing the alert overview, tabled data fields and values from our ECS document, as well as the raw JSON.

![ECS document with tabled data view from Elastic Stack security alerts](/assets/images/google-workspace-attack-surface-part-two/image3.png)

Most detection rules for GW can be developed with a few consistent fields such as those we describe in our [documentation](https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-module-google_workspace.html), making new rules easier to create. If you would like to view all data fields for GW that the ECS schema contains, you can find that information [here](https://www.elastic.co/guide/en/beats/filebeat/current/exported-fields-google_workspace.html).

## Let’s Trigger a Custom Rule

While pre-built detection rules are great for having threat coverage during onboarding, maybe you would like to search your data and create a new custom rule tailored to your environment.

Since the Elastic Stack is bundled with additional searching capabilities, we can rely on the Analytics [Discover](https://www.elastic.co/guide/en/kibana/current/discover.html) feature to start searching through our raw data for GW related documents by visiting Navigation Menu \> Analytics \> Discover.

From here, we can change our data view to logs-\* and then do an open-ended KQL query for `event.dataset: google_workspace*` which will return all documents where the source is from GW. You can then either start tabling the data based on available fields or view details about each document.

![Google Workspace ECS documents search in Discover in Elastic Stack](/assets/images/google-workspace-attack-surface-part-two/image2.png)

This is important to understand because it influences rule development. Rules are often prototyped as a data reduction exercise, beginning very broad and being refined over time into an effective rule. If you are having difficulty after this exercise with creating detection logic, our [philosophy](https://github.com/elastic/detection-rules/blob/main/PHILOSOPHY.md) on doing so may be of assistance.

First, we will add a user, Ray Arnold, to our organization who has administrative access. With our Ray Arnold account, we will generate some suspicious events in GW, such as creating a custom email route for Gmail that forwards email destined to our primary administrator (Terrance), to Ray Arnold. In this scenario we are focused on potential collection of sensitive information via email collection via an email forwarding rule ([T1114.003](https://attack.mitre.org/techniques/T1114/003/))

Complete the following steps:

1. Add Ray Arnold as a user:
2. Navigate to the users settings in GW
3. Select “add new user”
4. First name: Ray
5. Last name: Arnold
6. Select “ADD NEW USER”
7. Add Engineers group and make Ray Arnold the owner:
8. Navigate to groups settings in GW

You can configure the following settings like these examples:

1. Group name: Engineers
2. Group email: [engineering@dejesusarcheology.com](mailto:engineering@dejesusarcheology.com)
3. Group Description: Engineering group at dinosaur park who are responsible for technology and feeding velociraptors.
4. Group owners: [ray@dejesusarcheology.com](mailto:ray@dejesusarcheology.com)
5. Labels: Mailing and Security
6. Who can join the group: Only invited users
7. Select “Create Group”

Now we assign admin roles and privileges to Ray Arnold: 1. Navigate to Ray Arnold’s user account 2. Select “Admin roles and privileges” \> Assign Roles 3. Super Admin -\> Assigned 4. Groups Admin -\> Assigned 5. Services Admin -\> Assigned 6. Select “Save”

![Ray Arnold user created in Google Workspace with admin privileges](/assets/images/google-workspace-attack-surface-part-two/image12.jpg)

If done correctly, Ray Arnold should be a new user in GW for the DeJesus’ Archeology organization. He is also the owner of the Engineers group and has Super Admin, Groups Admin and Services Admin roles assigned to his account. Following this, we need to login to the GW admin console with Ray Arnold’s account and add a custom email route.

This provides our organization with an insider threat scenario. Ray Arnold was hired as an employee with authorization and authentication to GW admin console settings. Our organization trusts that Ray Arnold will receive compensation for the requirements agreed to during the hiring process. Risk-mitigation is then up to the administrator when scoping the proper permissions and roles applied to Ray Arnold.

![Simple overview of insider threat via email collection by forwarding rule in Google Workspace](/assets/images/google-workspace-attack-surface-part-two/image13.png)

Complete the following:

1. Login to the admin console with Ray Arnold’s account
2. Select Navigation Menu \> Apps \> Google Workspace \> Gmail \> Routing
3. Select Configure for “Routing”
4. Enter the following information
5. Description: Default administrator spam filtering
6. Email messages to affect: Inbound, Outbound, Internal - Sending, Internal - Receiving
7. Also deliver to: [ray@dejesusarcheology.com](mailto:ray@dejesusarcheology.com)
8. Account types to affect: Users
9. Envelope filter: Only affect specific envelope recipients (Email address: [terrance@dejesusarcheology.com](mailto:terrance@dejesusarcheology.com))

Now we can test our custom email route by sending [terrance@dejesusarcheology.com](mailto:terrance@dejesusarcheology.com) an email from a separate email (We created a random email account with Proton), that is private and discusses private details about new Paleo-DNA. Once you send an email, you can view Ray Arnold’s Gmail and see that this private email was additionally routed to [ray@dejesusarcheology.com](mailto:ray@dejesusarcheology.com), where we now have an existing insider threat potentially selling private information about our Paleo-DNA tests to competitors. This we cannot allow!

![](/assets/images/google-workspace-attack-surface-part-two/image11.gif)

### Identify a Potential Detection Rule for Custom Gmail Routes

Luckily, we have the Elastic Stack on our side to help us thwart this potential insider threat by detecting custom Gmail route creations! Within your Elastic Stack, visit Navigation Menu \> Analytics \> Discover and let’s start creating our KQL query. Below are the query filters we should be looking for and the final query.

KQL query:`event.dataset: google_workspace.admin and event.action: "CREATE_GMAIL_SETTING" and not related.user: terrance and google_workspace.admin.setting.name: (MESSAGE_SECURITY_RULE or EMAIL_ROUTE)`

Let’s break this down further to explain what we are looking for:

`event.dataset: google_workspace.admin` - Documents in ECS where the data sourced from GW, specifically admin reporting. Since a user needs to be an administrator, we should expect data to source from admin reporting, which may also indicate a compromised admin account or abuse of an admin not setup with principle of least-privilege (PoLP).

`event.action: "CREATE_GMAIL_SETTING"` - The creation of a Gmail setting which is typically done by administrators.

`not related.user: terrance` - So far, any creation of a Gmail setting by an administrator whose username is not “terrance” who is the only administrator that is expected to be touching such settings.

`google_workspace.admin.setting.name: (MESSAGE_SECURITY_RULE or EMAIL_ROUTE)` - This setting name is specific to Gmail routing rules.

Plugging this query into Discover, we have matching documents for this activity being reported in GW!

![Custom query search in Elastic Stack Discover for email forwarding rule creation](/assets/images/google-workspace-attack-surface-part-two/image10.png)

### Create a Custom Rule in the Security Feature

Let’s wrap this up by adding our custom detection rule for this!

To add your custom rule, complete the following:

1. In your Elastic Stack, select Navigation menu \> Security \> Manage \> Rules
2. Select “Create new rule”
3. Enter the following information:
4. Define rule: Source, Index Patterns: logs-google_workspace\*
5. Custom query: Our custom query

And we define rule metadata:

1. Name: Google Workspace Custom Forwarding Email Route Created
2. Description: Your choice
3. Default severity: High
4. Tags: Google Workspace

What is fantastic about this custom rule is we can send a notification via our platform of choice so we are notified immediately when this alert is triggered.

![Security alert action for custom rule](/assets/images/google-workspace-attack-surface-part-two/image17.jpg)

Then select “Create & enable rule” at the bottom to create your custom rule. If we replay the steps above to create a custom Gmail forwarding rule, we will now see an alert and receive a notification about the alert trigger!

![Security alert for new custom detection rule in Elastic Stack](/assets/images/google-workspace-attack-surface-part-two/image15.png)

At this point, we are now aware that Ray Arnold has created a custom Gmail route rule in GW with no authorization. From our alert in the Elastic Stack and notification to the CEO, we can now take action to mitigate further risk.

## Takeaways

As demonstrated, Elastic’s security solution and the Elastic Stack allow us to ingest GW reporting logs and scan this data with pre-built detection rules or custom rules. Combine this with other features of the stack such as [Enterprise Search](https://www.elastic.co/enterprise-search), [Observability](https://www.elastic.co/observability), and a very simple cloud stack deployment process and we can start detecting threats in our GW environment in no time.

It’s been quite a journey and you have accomplished an incredible amount of work. In part three of this series: Detecting Common Threats, we will emulate some common Google Workspace abuse by threat actors and create more advanced detection logic for these. Hold on tight, because it's about to get WILD.

Also, there is still so much more to explore within the Elastic Stack, as you have probably already found during this lab, so feel free to explore! Elastic continues to take action on security transparency as [recently](https://www.elastic.co/blog/continued-leadership-in-open-and-transparent-security) discussed.

Hopefully this provides you with a better understanding of the powerful capabilities within the Elastic Stack and how to use it to detect potential threats in GW. Thanks for reading/following along and may we all be in the capable hands of detection engineers in part three.
