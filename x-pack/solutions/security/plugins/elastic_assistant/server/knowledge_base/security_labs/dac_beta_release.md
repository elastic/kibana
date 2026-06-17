---
title: "Now in beta: New Detection as Code capabilities"
slug: "dac-beta-release"
date: "2024-08-08"
description: ""
author:
  - slug: mika-ayenson
  - slug: eric-forte
image: "Security Labs Images 18.jpg"
category:
  - slug: detection-science
---

Exciting news! Our Detections as Code (DaC) improvements to the [detection-rules](https://github.com/elastic/detection-rules) repo are now in beta. In May this year, we shared the Alpha stages of our research into [Rolling your own Detections as Code with Elastic Security](https://www.elastic.co/blog/detections-as-code-elastic-security). Elastic is working on supporting DaC in Elastic Security. While in the future DaC will be integrated within the UI, the current updates are focused on the detection rules repo on main to allow users to set up DaC quickly and get immediate value with available tests and commands integration with Elastic Security. We have a considerable amount of [documentation](https://dac-reference.readthedocs.io/en/latest/index.html) and [examples](https://dac-reference.readthedocs.io/en/latest/etoe_reference_example.html), but let’s take a quick look at what this means for our users.  

## Why DaC?

From validation and automation to enhancing cross-vendor content, there are several reasons [previously discussed](https://www.elastic.co/blog/detections-as-code-elastic-security#why-detections-as-code) to use a DaC approach for rule management. Our team of detection engineers have been using the detection rules repo for testing and validation of our rules for some time. We now can provide the same testing and validation that we perform in a more accessible way. We aim to empower our users by adding straightforward CLI commands within our detection-rules repo, to help manage rules across the full rule lifecycle between version control systems (VCS) and Kibana. This allows users to move, unit test, and validate their rules in a single command easily using CI/CD pipelines.

## Improving Process Maturity

![](/assets/images/dac-beta-release/image10.png)

Security organizations are facing the same bottomline, which is that we can’t rely on static out-of-the-box signatures. At its core, DaC is a methodology that applies software development practices to the creation and management of security detection rules, enabling automation, version control, testing, and collaboration in the development & deployment of security detections. Unit testing, peer review, and CI/CD enable software developers to be confident in their processes. These help catch errors and inefficiencies before they impact their customers. The same should be true in detection engineering. Fitting with this declaration here are some examples of some of the new features we are supporting. See our [DaC Reference Guide](https://dac-reference.readthedocs.io/en/latest/) for complete documentation.

### Bulk Import and Export of Custom Rules

Custom rules can now be moved in bulk to and from Kibana using the ```kibana import-rules``` and ```kibana export-rules``` commands. Additionally, one can move them in bulk to and from TOML format to ndjson using the ```import-rules-to-repo``` and ```export-rules-from-repo``` commands. In addition to rules, these commands support moving exceptions and exception lists using the appropriate flag. The ndjson approach's benefit is that it allows engineers to manage and share a collection of rules in a single file (exported by the CLI or from Kibana), which is helpful when access is not permitted to the other Elastic environment. When moving rules using either of these methods, the rules pass through schema validation unless otherwise specified to ensure that the rules contain the appropriate data fields. For more information on these commands, please see the [```CLI.md```](https://github.com/elastic/detection-rules/blob/DAC-feature/CLI.md) file in detection rules. 

### Configurable Unit Tests, Validation, and Schemas

With this new feature, we've now included the ability to configure the behavior of unit tests and schema validation using configuration files. In these files, you can now set specific tests to be bypassed, specify only specific tests to run, and likewise with schema validation against specific rules. You can run this validation and unit tests at any time by running ```make test```. Furthermore, you can now bring your schema (JSON file) to our validation process. You can also specify which schemas to use against which target versions of your Stack. For example, if you have custom schemas that only apply to rules in 8.14 while you have a different schema that should be used for 8.10, this can now be managed via a configuration file. For more information, please see our [example configuration file](https://github.com/elastic/detection-rules/blob/DAC-feature/detection_rules/etc/_config.yaml) or use our ```custom-rules setup-config``` command from the detection rules repo to generate an example for you.

### Custom Version Control

We now are providing the ability to manage custom rules using the same version lock logic that Elastic’s internal team uses to manage our rules for release. This is done through a version lock file that checks the hash of the rule contents and determines whether or not they have changed. Additionally, we are providing a configuration option to disable this version lock file to allow users to use an alternative means of version control such as using a git repo directly. For more information please see the [version control section](https://dac-reference.readthedocs.io/en/latest/internals_of_the_detection_rules_repo.html#rule-versioning) of our documentation. Note that you can still rely on Kibana’s versioning fields.

Having these systems in place provides auditable evidence for maintaining security rules. Adopting some or all of these best practices can dramatically improve quality in maintaining and developing security rules.

### Broader Adoption of Automation

While quality is critical, security teams and organizations face  growing rule sets to respond to an ever-expanding threat landscape. As such, it is just as crucial to reduce the strain on security analysts by providing rapid deployment and execution. For our repo, we have a single-stop shop where you can set your configuration, focus on rule development, and let the automation handle the rest.  

#### Lowering the Barrier to Entry

To start, simply clone or fork our detection rules repo, run ```custom-rules setup-config``` to generate an initial config, and import your rules. From here, you now have unit tests and validation ready for use. If you are using GitLab, you can quickly create CI/CD to push the latest rules to Kibana and run these tests. Here is an [example](https://dac-reference.readthedocs.io/en/latest/core_component_syncing_rules_and_data_from_vcs_to_elastic_security.html#option-1-push-on-merge) of what that could look like:

![Example CI/CD Workflow](/assets/images/dac-beta-release/image2.png)

### High Flexibility

While we use GitHub CI/CD for managing our release actions, by no means are we prescribing that this is the only way to manage detection rules. Our CLI commands have no dependencies outside of their python requirements. Perhaps you have already started implementing some DaC practices, and you may be looking to take advantage of the Python libraries we provide. Whatever the case may be, we want to encourage you to try adopting DaC principles in your workflows and we would like to provide flexible tooling to accomplish these goals. 

To illustrate an example, let’s say we have an organization that is already managing their own rules with a VCS and has built automation to move rules back and forth from deployment environments. However, they would like to augment these movements with testing based on telemetry which they are collecting and storing in a database. Our DaC features already provide custom unit testing classes that can run per rule. Realizing this goal may be as simple as forking the detection rules repo and writing a single unit test. The figure below shows an example of what this could look like.  

![Testing and Tuning via Data Source Input Workflow](/assets/images/dac-beta-release/image3.png)

This new unit test could utilize our unit test classes and rule loading to provide scaffolding to load rules from a file or Kibana instance. Next, one could create different integration tests against each rule ID to see if they pass the organization's desired results (e.g. does the rule identify the correct behaviors). If they do, the CI/CD tooling can proceed as originally planned. If they fail, one can use DaC tooling to move those rules to a “needs tuning” folder and/or upload those rules to a “Tuning” Kibana space. In this way, one could use a hybrid of our tooling and one's own tooling to keep an up to date Kibana space (or VCS controlled folder) of what rules require updates. As updates are made and issues addressed, they could also be continually synchronized across spaces, leading to a more cohesive environment.

This is just one idea of how one can take advantage of our new DaC features in your environment. In practice, there are a vast number of different ways they can be utilized.

## In Practice

Now, let’s take a look at how we can tie these new features together into a cohesive DaC strategy. As a reminder, this is not prescriptive. Rather, this should be thought of as an optional, introductory strategy that can be built on to achieve your DaC goals.

### Establishing a DaC Baseline

In detection engineering, we would like collaboration to be a default rather than an exception. Detection Rules is a public repo precisely with this precept in mind. Now, it can become a basis for the community and teammates to not only collaborate with us, but also with each other. Let’s use the chart below as an example for what this could look like. 

![DaC Baseline Workflow](/assets/images/dac-beta-release/image1.png)

Reading from left to right, we have initial planning and prioritization and the subsequent threat research that drives the detection engineering. This process will look quite different for each user so we are not going to spend much time describing it here. However, the outcome will largely be similar, the creation of new detection rules. These could be in various forms like Sigma rules (more in a later blog), Elastic TOML rule files, or creating the rules directly in Kibana. Regardless of format, once created these rules need to be staged. This would either occur in Kibana, your VCS, or both. From a DaC perspective, the goal is to sync the rules such that the process/automation are aware of these new additions. Furthermore, this provides the opportunity for peer review of these additions — the first stage of collaboration. 

![Peer Review Workflow](/assets/images/dac-beta-release/image8.png)

This will likely happen in your version control system; for instance, in GitHub one could use a PR with required approvals before merging back into a main branch that acts as the authoritative source of reviewed rules. The next step is for testing and validation, this step could additionally occur before peer review and this is largely up to the desired implementation. 

![Validation to Production Workflow](/assets/images/dac-beta-release/image11.png)

In addition to any other internal release processes, by adhering to this workflow, we can reduce the risk of malformed rules and errant mistakes from reaching both our customers and the community. Additionally, having the evidence artifacts, passing unit tests, schema validation, etc., inspires confidence and provides control for each user to choose what risks they are willing to accept. 

Once deployed and distributed, rule performance can be monitored from Kibana. Updates to these rules can be made either directly from Kibana or through the VCS. This will largely be dependent on the implementation specifics, but in either case, these can be treated very similarly to new rules and pass through the same peer review, testing, and validation processes.

![Tuning Production Deployment Workflow](/assets/images/dac-beta-release/image14.png)

As shown in the figure above, this can provide a unified method for handling rule updates whether from the community, customers, or from internal feedback. Since the rules ultimately exist as version-controlled files, there is a dedicated format source of truth to merge and test against. 

In addition to the process quality improvements, having authoritative known states can empower additional automation. As an example, different customers may require different testing or perhaps different data sources. Instead of having to parse the rules manually, we provide a unified configuration experience where users can simply bring their own config and schemas and be confident that their specific requirements are met. All of this can be managed automatically via CI/CD. With a fully automated DaC setup, one can take advantage of this system entirely from VCS and Kibana without needing to write additional code. Let’s take a look at an example of what this could look like. 

### Example

For this example, we are going to be acting as an organization that has 2 Kibana spaces they want to manage via DaC. The first is a development space that rule authors will be using to write detection rules (so let’s assume there are some preexisting rules already available). There will also be some developers that are writing detection rules directly in TOML file formats and adding them to our VCS, so we will need to manage synchronization of these. Additionally, this organization wants to enforce unit testing and schema validation with the option for peer review on rules that will be deployed to a production space in the same Kibana instance. Finally, the organization wants all of this to occur in an automated manner with no requirement to either clone detection rules locally or write rules outside of a GUI. 

In order to accomplish this we will need to make use of a few of the new DaC features in detection rules and write some simple CI/CD workflows. In this example we are going to be using GitHub. Additionally, you can find a video walkthrough of this example [here](https://dac-reference.readthedocs.io/en/latest/etoe_reference_example.html#demo-video). As a note, if you wish to follow along you will need to fork the detection rules repo and create an initial configuration using our ```custom-rules setup-config``` command. Also for general step by step instructions on how to use the DAC features, see this [quickstart guide](https://dac-reference.readthedocs.io/en/latest/etoe_reference_example.html#quick-start-example-detection-rules-cli-commands), which has several example commands.

#### Development Space Rule Synchronization

First we are going to synchronize from Kibana -> GitHub (VCS). To do this we will be using the ```kibana import-rules``` and ```kibana export-rules``` detection rules commands. Additionally, in order to keep the rule versions synchronized we will be using the locked versions file as we are wanting both our VCS and Kibana to be able to overwrite each other with the latest versions. This is not required for this setup, either Kibana or GitHub (VCS) could be used authoritatively instead of the locked versions file. But we will be using it for convenience. 

The first step is for us to make a manual dispatch trigger that will pull the latest rules from Kibana upon request. In our setup this could be done automatically; however, we want to give rule authors control for when they want to move their rules to the VCS as the development space in Kibana is actively used for development and the presence of a new rule does not necessarily mean the rule is ready for VCS. The manual dispatch section could look like the following [example](https://dac-reference.readthedocs.io/en/latest/core_component_syncing_rules_and_data_from_elastic_security_to_vcs.html#option-1-manual-dispatch-pull):

![](/assets/images/dac-beta-release/image15.png)

With this trigger in place, we now can write 4 additional jobs that will trigger on this workflow dispatch. 

 1. Pull the rules from the desired Kibana space. 
 2. Update the version lock file. 
 3. Create a PR request for review to merge into the main branch in GitHub. 
 4. Set the correct target for the PR.

These jobs could look like this also from the same [example](https://dac-reference.readthedocs.io/en/latest/core_component_syncing_rules_and_data_from_elastic_security_to_vcs.html#option-1-manual-dispatch-pull):

![](/assets/images/dac-beta-release/image12.png)

Now, once we run this workflow we should expect to see a PR open with the new rules from the Kibana Dev space. We also need to synchronize rules from GitHub (VCS) to Kibana. For this we will need to create a triggers on pull request:
 
![](/assets/images/dac-beta-release/image4.png)
 
Next, we just need to create a job that uses the ```kibana import-rules``` command to push the rule files from the given PR to Kibana. See the second [example](https://dac-reference.readthedocs.io/en/latest/core_component_syncing_rules_and_data_from_vcs_to_elastic_security.html#option-1-push-on-merge) for the complete workflow file.

![](/assets/images/dac-beta-release/image5.png)

With these two workflows complete we now have synchronization of rules between GitHub and the Kibana Dev space. 

### Production Space Deployment

With the Dev space synchronized, now we need to handle the prod space. As a reminder, for this we need to enforce unit testing, schema validation, available peer review for PRs to main, and on merge to main auto push to the prod space. To accomplish this we will need two workflow files. The first will run unit tests on all pull requests and pushes to versioned branches. The second will push the latest rules merged to main to the prod space in Kibana. 

The first workflow file is very simple. It has an on push and pull_request trigger and has the core job of running the ```test``` command shown below. See this [example](https://dac-reference.readthedocs.io/en/latest/core_component_syncing_rules_and_data_from_elastic_security_to_vcs.html#sub-component-3-optional-unit-testing-rules-via-ci-cd) for the full workflow.

![](/assets/images/dac-beta-release/image5.png)

With this ```test``` command we are performing unit tests and schema validation with the parameters specified in our config files on all of our custom rules. Now we just need the workflow to push the latest rules to the prod space. The core of this workflow is the ```kibana import-rules ```command again just using the prod space as the destination. However, there are a number of additional options provided to this workflow that are not necessary but nice to have in this example, such as options to overwrite and update exceptions/exception lists as well as rules. The core job is shown below. Please see [this example](https://dac-reference.readthedocs.io/en/latest/core_component_syncing_rules_and_data_from_vcs_to_elastic_security.html#option-1-push-on-merge) for the full workflow file.

![](/assets/images/dac-beta-release/image7.png)

And there we have it, with those 4 workflow files we have a synchronized development space with rules passing through unit testing and schema validation. We have the option for peer review through the use of pull requests, which can be made as requirements in GitHub before allowing for merges to main. On merge to main in GitHub we also have an automated push to the Kibana prod space, establishing our baseline of rules that have passed our organizations requirements and are ready for use. All of this was accomplished without writing additional Python code, just by using our new DaC features in GitHub workflows.

## Conclusion

Now that we’ve reached this milestone, you may be wondering what’s next? We’re planning to spend the next few cycles continuing to test edge cases and incorporating feedback from the community as part of our business-as-usual sprints. We also have a backlog of features request considerations so if you want to voice your opinion, checkout the issues titled ```[FR][DAC] Consideration:``` or open a similar new issue if it’s not already recorded. This will help us to prioritize the most important features for the community.
    
We’re always interested in hearing use cases and workflows like these, so as always, reach out to us via [GitHub issues](https://github.com/elastic/detection-rules/issues), chat with us in our [security-rules-dac](https://elasticstack.slack.com/archives/C06TE19EP09) slack channel, and ask questions in our [Discuss forums](https://discuss.elastic.co/c/security/endpoint-security/80)!