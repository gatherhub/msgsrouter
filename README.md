# Message Switch Router
Message Switch Router (MSR) is a WebSocket server implementation. It works together with PeerCom to create a peer-to-peer communication application.

MSR is a partial work of Gatherhub. A WebSocket client connects to MSR and presents with its PEER and HUB information. MSR will assign a unique PEER_ID to the connected peer.  Peers with the same HUB configuration can communicate with each others with the PEER_ID.

# Installation

MSR is written in Ruby. (considering to reimplement in Node.js) To run MSR, you will need to instrall Ruby runtime environment. Please refer to the Ruby installation guide.

There are also a couple Ruby Gems dependency,

- **em-websocket** (Event-Machine WebSocket library provides essential WebSocket function)
- **geoip** (IP Geo-location library helps to log the connected peer's location information for usage analysis)

Please refer to Ruby Gem intallation guide and install these gems before running MSR.

## Configure MSR

Open config.rb and edit four configuration parameters and remove '#' to uncomment the code,

```ruby
#LOGFILE = "<path and filename to your log file>"
#PRIVATEKEY = "<path and filename to your https server private key>"
#CERTIFICATE = "<path and filename to your https server certificate>"
#GEOFILE = "<path and filename to your geo location file>"
```

## Running MSR

When the Runy runtime environment and dependent Gems are installed, you may run MSR as the following,

```shell
$ ruby msg_srouter.rb
```

By default, MSR will be listen on TCP port 55555, to listen on a different port, you can do this,

```shell
$ ruby msg_srouter.rb 5000
```

MSR can be run in Linux or Windows OS. To run MSR as a system service, please refer to the OS guide.

# License

msgsrouter is released and distributed under the permissive MIT License: Copyright (c) Quark Li, quarkli@gmail.com