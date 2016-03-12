# Message Switch Router
Message Switch Router (MSR) is a WebSocket server implementation. It works together with [PeerCom](https://github.com/gatherhub/peercom) to create a peer-to-peer communication application.

* MSR is a partial work of Gatherhub. A WebSocket client connects to MSR and presents with its PEER and HUB information. MSR will assign a unique PEER_ID to the connected peer.  Peers with the same HUB configuration can communicate with each others with the PEER_ID.

* There are Ruby and NodeJS implementations. Please refer to the README in their own folder for more detail about installation and deployment.

* MSR can be run in Linux or Windows OS. To run MSR as a system service, please refer to the OS guide.

# License

msgsrouter is released and distributed under the permissive MIT License: Copyright (c) Quark Li, quarkli@gmail.com
