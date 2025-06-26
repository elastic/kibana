---
title: "Dissecting REMCOS RAT: An in-depth analysis of a widespread 2024 malware, Part Two"
slug: "dissecting-remcos-rat-part-two"
date: "2024-04-30"
subtitle: "Part two: Diving into REMCOS recording capabilities, launch, and C2 communication"
description: "In the previous article in this series on the REMCOS implant, we shared information about execution, persistence, and defense evasion mechanisms. Continuing this series we’ll cover the second half of its execution flow and you’ll learn more about REMCOS recording capabilities and communication with its C2."
author:
  - slug: cyril-francois
  - slug: samir-bousseaden
image: "Security Labs Images 21.jpg"
category:
  - slug: malware-analysis
tags:
  - malware-analysis
  - remcos
---

In the [previous article](https://www.elastic.co/security-labs/dissecting-remcos-rat-part-one) in this series on the REMCOS implant, we shared information about execution, persistence, and defense evasion mechanisms. Continuing this series we’ll cover the second half of its execution flow and you’ll learn more about REMCOS recording capabilities and communication with its C2.

## Starting watchdog

If the ```enable_watchdog_flag``` (index ```0x32```) is enabled, the REMCOS will activate its watchdog feature.

![0x40F24F Starting watchdog feature if enabled in the configuration](/assets/images/dissecting-remcos-rat-part-two/image68.png)


This feature involves the malware launching a new process, injecting itself into it, and monitoring the main process. The goal of the watchdog is to restart the main process in case it gets terminated. The main process can also restart the watchdog if it gets terminated.


![Console message indicating activation of watchdog module](/assets/images/dissecting-remcos-rat-part-two/image49.png)


The target binary for watchdog injection is selected from a hardcoded list, choosing the first binary for which the process creation and injection are successful:

 - ```svchost.exe```
 - ```rmclient.exe```
 - ```fsutil.exe```

![0x4122C5 Watchdog target process selection](/assets/images/dissecting-remcos-rat-part-two/image32.png)


In this example, the watchdog process is ```svchost.exe```.

![svchost.exe watchdog process](/assets/images/dissecting-remcos-rat-part-two/image3.png)


The registry value ```HKCU/SOFTWARE/{MUTEX}/WD``` is created before starting the watchdog process and contains the main process PID.

![The main process PID is saved in the WD registry key](/assets/images/dissecting-remcos-rat-part-two/image31.png)


Once REMCOS is running in the watchdog process, it takes a "special" execution path by verifying if the ```WD``` value exists in the malware registry key. If it does, the value is deleted, and the monitoring procedure function is invoked.
 
![0x40EB54 Watchdog execution path when WD registry value exists](/assets/images/dissecting-remcos-rat-part-two/image63.png)

It is worth noting that the watchdog process has a special mutex to differentiate it from the main process mutex. This mutex string is derived from the configuration (index ```0xE```) and appended with ```-W```.

![Mutex field in the configuration](/assets/images/dissecting-remcos-rat-part-two/image92.png)


![Comparison between main process and watchdog process mutexes](/assets/images/dissecting-remcos-rat-part-two/image64.png)


When the main process is terminated, the watchdog detects it and restarts it using the ```ShellExecuteW``` API with the path to the malware binary retrieved from the ```HKCU/SOFTWARE/{mutex}/exepath``` registry key

![Console message indicating process restart by watchdog](/assets/images/dissecting-remcos-rat-part-two/image30.png)


## Starting recording threads

### Keylogging thread

The offline keylogger has two modes of operation:

 1. Keylog everything
 2. Enable keylogging when specific windows are in the foreground

When the ```keylogger_mode``` (index ```0xF```) field is set to 1 or 2 in the configuration, REMCOS activates its "Offline Keylogger" capability.

![](/assets/images/dissecting-remcos-rat-part-two/image62.png)


Keylogging is accomplished using the ```SetWindowsHookExA``` API with the ```WH_KEYBOARD_LL``` constant.

![0x40A2B8 REMCOS setting up keyboard event hook using SetWindowsHookExA](/assets/images/dissecting-remcos-rat-part-two/image23.png)


The file where the keylogging data is stored is built using the following configuration fields:

 - ```keylogger_root_directory``` (index ```0x31```)
 - ```keylogger_parent_directory``` (index ```0x10```)
 - ```keylogger_filename``` (index ```0x11```)

The keylogger file path is ```{keylogger_root_directory}/{keylogger_parent_directory}/{keylogger_filename}```. In this case, it will be ```%APPDATA%/keylogger.dat```.

![Keylogging data file keylogger.dat](/assets/images/dissecting-remcos-rat-part-two/image8.png)


![Keylogging data content](/assets/images/dissecting-remcos-rat-part-two/image94.png)


The keylogger file can be encrypted by enabling the ```enable_keylogger_file_encryption_flag``` (index ```0x12```) flag in the configuration. It will be encrypted using the RC4 algorithm and the configuration key.

![0x40A7FC Decrypting, appending, and re-encrypting the keylogging data file](/assets/images/dissecting-remcos-rat-part-two/image51.png)


The file can also be made super hidden by enabling the ```enable_keylogger_file_hiding_flag``` (index ```0x13```) flag in the configuration.

When using the second keylogging mode, you need to set the ```keylogger_specific_window_names``` (index ```0x2A```) field with strings that will be searched in the current foreground window title every 5 seconds.

![0x40A109 Keylogging mode choice](/assets/images/dissecting-remcos-rat-part-two/image84.png)


Upon a match, keylogging begins. Subsequently, the current foreground window is checked every second to stop the keylogger if the title no longer contains the specified strings.

![Monitoring foreground window for keylogging activation](/assets/images/dissecting-remcos-rat-part-two/image79.png)


### Screen recording threads

When the ```enable_screenshot_flag``` (index ```0x14```) is enabled in the configuration, REMCOS will activate its screen recording capability.

![0x40F0B3 Starting screen recording capability when enabled in configuration](/assets/images/dissecting-remcos-rat-part-two/image81.png)


To take a screenshot, REMCOS utilizes the ```CreateCompatibleBitmap``` and the ```BitBlt``` Windows APIs. If the ```enable_screenshot_mouse_drawing_flag``` (index ```0x35```) flag is enabled, the mouse is also drawn on the bitmap using the ```GetCursorInfo```, ```GetIconInfo```, and the ```DrawIcon``` API.

![0x418E76 Taking screenshot 1/2](/assets/images/dissecting-remcos-rat-part-two/image6.png)


![0x418E76 Taking screenshot 2/2](/assets/images/dissecting-remcos-rat-part-two/image82.png)


The path to the folder where the screenshots are stored is constructed using the following configuration:
 - ```screenshot_parent_directory``` (index ```0x19```)
 - ```screenshot_folder``` (index ```0x1A```)

The final path is ```{screenshot_parent_directory}/{screenshot_folder}```.

REMCOS utilizes the ```screenshot_interval_in_minutes``` (index ```0x15```) field to capture a screenshot every X minutes and save it to disk using the following format string: ```time_%04i%02i%02i_%02i%02i%02i```.

![Location where screenshots are saved](/assets/images/dissecting-remcos-rat-part-two/image45.png)


Similarly to keylogging data, when the ```enable_screenshot_encryption_flag``` (index ```0x1B```) is enabled, the screenshots are saved encrypted using the RC4 encryption algorithm and the configuration key.

At the top, REMCOS has a similar "specific window" feature for its screen recording as its keylogging capability. When the ```enable_screenshot_specific_window_names_flag``` (index ```0x16```) is set, a second screen recording thread is initiated.

![0x40F108 Starting specific window screen recording capability when enabled in configuration](/assets/images/dissecting-remcos-rat-part-two/image20.png)



This time, it utilizes the ```screenshot_specific_window_names``` (index ```0x17```) list of strings to capture a screenshot when the foreground window title contains one of the specified strings. Screenshots are taken every X seconds, as specified by the ```screenshot_specific_window_names_interval_in_seconds``` (index ```0x18```) field.

In this case, the screenshots are saved on the disk using a different format string: ```wnd_%04i%02i%02i_%02i%02i%02i```. Below is an example using ["notepad"] as the list of specific window names and setting the Notepad process window in the foreground.

![Screenshot triggered when Notepad window is in the foreground](/assets/images/dissecting-remcos-rat-part-two/image89.png)


### Audio recording thread

When the ```enable_audio_recording_flag``` (index ```0x23```) is enabled, REMCOS initiates its audio recording capability.

![0x40F159 Starting audio recording capability when enabled in configuration](/assets/images/dissecting-remcos-rat-part-two/image24.png)


The recording is conducted using the Windows ```Wave*``` API. The duration of the recording is specified in minutes by the ```audio_recording_duration_in_minutes``` (```0x24```) configuration field.

![0x401BE9 Initialization of audio recording](/assets/images/dissecting-remcos-rat-part-two/image2.png)


After recording for X minutes, the recording file is saved, and a new recording begins. REMCOS uses the following configuration fields to construct the recording folder path:

 - ```audio_record_parent_directory``` (index ```0x25```)
 - ```audio_record_folder``` (index ```0x26```)

The final path is ```{audio_record_parent_directory}/{audio_record_folder}```. In this case, it will be ```C:\MicRecords```. Recordings are saved to disk using the following format: ```%Y-%m-%d %H.%M.wav```.

![Audio recording folder](/assets/images/dissecting-remcos-rat-part-two/image33.png)


## Communication with the C2

After initialization, REMCOS initiates communication with its C2. It attempts to connect to each domain in its ```c2_list``` (index ```0x0```) until one responds.

According to previous research, communication can be encrypted using TLS if enabled for a specific C2. In such cases, the TLS engine will utilize the ```tls_raw_certificate``` (index ```0x36```), ```tls_key``` (index ```0x37```), and ```tls_raw_peer_certificate``` (index ```0x38```) configuration fields to establish the TLS tunnel.

It's important to note that in this scenario, only one peer certificate can be provided for multiple TLS-enabled C2 domains. As a result, it may be possible to identify other C2s using the same certificate.

Once connected we received our first packet:

![Hello packet from REMCOS](/assets/images/dissecting-remcos-rat-part-two/image80.png)


As [described in depth by Fortinet](https://www.fortinet.com/blog/threat-research/latest-remcos-rat-phishing), the protocol hasn't changed, and all packets follow the same structure:

 - (orange)```magic_number```:  ```\x24\x04\xff\x00```
 - (red)```data_size```: ```\x40\x03\x00\x00```
 - (green)```command_id``` (number): ```\0x4b\x00\x00\x00```
 - (blue)data fields separated by ```|\x1e\x1e\1f|```

After receiving the first packet from the malware, we can send our own command using the following functions.

```Python
MAGIC = 0xFF0424
SEPARATOR = b"\x1e\x1e\x1f|"


def build_command_packet(command_id: int, command_data: bytes) -> bytes:
	return build_packet(command_id.to_bytes(4, byteorder="little") + command_data)


def build_packet(data: bytes) -> bytes:
	packet = MAGIC.to_bytes(4, byteorder="little")
	packet += len(data).to_bytes(4, byteorder="little")
	packet += data
	return packet
```

Here we are going to change the title of a Notepad window using the command 0x94, passing as parameters its window handle (329064) and the text of our choice.

```Python
def main() -> None:
	server_0 = nclib.TCPServer(("192.168.204.1", 8080))

	for client in server_0:
    	print(client.recv_all(5))

    	client.send(build_command_packet(
            			0x94,
            			b"329064" + SEPARATOR + "AM_I_A_JOKE_TO_YOU?".encode("utf-16-le")))
```

![REMCOS executed the command, changing the Notepad window text](/assets/images/dissecting-remcos-rat-part-two/image1.png)


That’s the end of the second article. The third part will cover REMCOS' configuration and its C2 commands.