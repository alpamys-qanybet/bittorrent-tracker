function now() {
	return Math.floor(new Date().getTime()/1000);
}

const EVENT_NONE = 0;
const EVENT_COMPLETED = 1;
const EVENT_STARTED = 2;
const EVENT_STOPPED = 3;

function event(e) {
	switch (e) {
		case "completed":
			return EVENT_COMPLETED;
		case "started":
			return EVENT_STARTED;
		case "stopped":
			return EVENT_STOPPED;
	}

	return EVENT_NONE;
}


const PEERSTATE_SEEDER = 0;
const PEERSTATE_LEECHER = 1;

const PEER_COMPACT_SIZE = 6;

const ANNOUNCE_INTERVAL = 10;

function Peer(ip, port, left) {
	if (!(this instanceof Peer))
		return new Peer(ip, port, left);

	this.compact = this._compact(ip, port)

	this.state = (left > 0) ? PEERSTATE_LEECHER : PEERSTATE_SEEDER;

	this.touch();
}

Peer.prototype = {
	touch: function() {
		this.lastAction = now();
	},
	timedOut: function(n) {
		return n - this.lastAction > ANNOUNCE_INTERVAL * 2;
	},
	_compact: function(ip, port) {
		var b = new Buffer(PEER_COMPACT_SIZE);

		var parts = ip.split(".");
		if (parts.length != 4)
			throw 1

		for (var i = 0; i < 4; i++)
			b[i] = parseInt(parts[i]);

		b[4] = (port >> 8) & 0xff;
		b[5] = port & 0xff;

		return b;
	}
}

function File() {
	if (!(this instanceof File))
		return new File();

	this.peerList = [];

	this.peerDict = {};

	this.downloads = 0;
	this.seeders = 0;
	this.leechers = 0;
/*
	var peer1 = new Peer('10.0.1.160', '51413', '1074692');
	this.insertPeer(peer1);
	var peer2 = new Peer('127.0.0.1', '51413', '0');
	this.insertPeer(peer2);

	console.log('peerList initial');
	console.log(this.peerList);
*/


/*	var config = require('./config');
	
	console.log('server');
	for (var prop in config) {
		var server = config[prop];

		peer = new Peer(server.ip, server.port, '0');

		this.insertPeer(peer);
	}
*/

	var fs = require('fs');
	var file = fs.readFileSync(__dirname + '/settings.json', "utf8");
	console.log('file');
	console.log(file);

	config = JSON.parse(file);
	for (var prop in config) {
		var server = config[prop];

		console.log('eval(server.enabled)');
		console.log(eval(server.enabled));
		if ( eval(server.enabled) ) {
			peer = new Peer(server.ip, server.port, '0');

			this.insertPeer(peer);
		}
	}	

	console.log('peerList initial');
	console.log(this.peerList);

	this.lastCompact = now();
}

File.prototype = {
	addPeer: function(peerId, peer, event) {
		// Check if it is time to compact the peer list
		var n = now();
		if (this.seeders + this.leechers < this.peerList.length / 2 && this.peerList.length > 10 || (n - this.lastCompact) > ANNOUNCE_INTERVAL * 2) {
			newPeerList = [];
			var i = 0;
			for (var p in this.peerDict) {
				if (!this.peerDict.hasOwnProperty(p))
					continue;

				var tmpPeer = this.peerList[this.peerDict[p]];

				// Check if the peer is still alive
				if (tmpPeer.timedOut(n)) {
					if (tmpPeer.state == PEERSTATE_LEECHER)
						this.leechers--;
					else
						this.seeders--;

					delete this.peerDict[p];
					continue;
				}

				newPeerList.push(tmpPeer);
				this.peerDict[p] = i++;
			}

			this.peerList = newPeerList;

			this.lastCompact = n;
		}

		if (event == EVENT_COMPLETED && peer.state == PEERSTATE_SEEDER)
			this.downloads++;

		// Check if the peer already exists
		if (this.peerDict.hasOwnProperty(peerId)) {
			var index = this.peerDict[peerId];
			var oldPeer = this.peerList[index];

			if (event == EVENT_STOPPED) {
				if (oldPeer.state === PEERSTATE_LEECHER)
					this.leechers--;
				else
					this.seeders--;

				delete this.peerList[index];
				delete this.peerDict[peerId];
			} else {
				// TODO: Should probably update compact in the old peer. So we
				// handle the case if the user switched IP or Port. But we
				// probably only want to do it if they differ
				// oldPeer.compact = peer.compact;

				if (oldPeer.state != peer.state) {
					if (peer.state === PEERSTATE_LEECHER) {
						this.leechers++;
						this.seeders--;
					} else {
						this.leechers--;
						this.seeders++;
					}

					oldPeer.state = peer.state;
				}
			}

			peer = oldPeer;
			peer.touch();

		} else if (event != EVENT_STOPPED) {
			this.peerDict[peerId] = this.peerList.length;
			console.log('this.peerList.push(peer)');
			console.log(peer);

/*			[ { compact: <Buffer 7f 00 00 01 80 07>,
    state: 0,
    lastAction: 1364471850 } ]
*/
			this.peerList.push(peer);

			if (peer.state === PEERSTATE_LEECHER)
				this.leechers++;
			else
				this.seeders++;
		}

		return peer;
	},
	connectPeer: function(peerId, peer, event) {
		// Check if it is time to compact the peer list
		var n = now();

		console.log('connectPeer');

		console.log('peerUrl');
		var peerUrl = peer.compact.toString('hex', 0, peer.compact.length);
		console.log(peerUrl);
		
/*		for (var prop in this.peerList)
		{
			var p = this.peerList[prop];
			
			// console.log('p.compact connectPeer');
			// console.log(p.compact);
			var tempUrl = p.compact.toString('hex', 0, p.compact.length);
			console.log('tempUrl == peerUrl');
			console.log(tempUrl);

			if ( peerUrl == tempUrl ) {
				this.peerDict[peerId] = eval(prop);
				break;
			}
		}
*/
/*		if (this.seeders + this.leechers < this.peerList.length / 2 && this.peerList.length > 10 || (n - this.lastCompact) > ANNOUNCE_INTERVAL * 2) {
			//newPeerList = [];
			//var i = 0;
			for (var p in this.peerDict) {
				if (!this.peerDict.hasOwnProperty(p))
					continue;

				var tmpPeer = this.peerList[this.peerDict[p]];

				// Check if the peer is still alive
				if (tmpPeer.timedOut(n)) {
					if (tmpPeer.state == PEERSTATE_LEECHER)
						this.leechers--;
					else
						this.seeders--;

					delete this.peerDict[p];
					continue;
				}

				//newPeerList.push(tmpPeer);
				// this.peerDict[p] = i++;

				for (var prop in this.peerList)
				{
					var pList = this.peerList[prop];
					
					// console.log('p.compact connectPeer');
					// console.log(p.compact);
					var tempUrl = pList.compact.toString('hex', 0, pList.compact.length);
					
					if ( peerUrl == tempUrl ) {
						this.peerDict[p] = eval(prop);
						break;
					}
				}
			}

			//this.peerList = newPeerList;
			this.lastCompact = n;
		}
*/
/*		if (event == EVENT_COMPLETED && peer.state == PEERSTATE_SEEDER)
			this.downloads++;

		// Check if the peer already exists
		if (this.peerDict.hasOwnProperty(peerId)) {
			var index = this.peerDict[peerId];
			var oldPeer = this.peerList[index];

			console.log('oldPeer');
			console.log(oldPeer);

			if (event == EVENT_STOPPED) {
				if (oldPeer.state === PEERSTATE_LEECHER)
					this.leechers--;
				else
					this.seeders--;

				// delete this.peerList[index];
				delete this.peerDict[peerId];
			} else {
				// TODO: Should probably update compact in the old peer. So we
				// handle the case if the user switched IP or Port. But we
				// probably only want to do it if they differ
				// oldPeer.compact = peer.compact;

				if (oldPeer.state != peer.state) {
					if (peer.state === PEERSTATE_LEECHER) {
						this.leechers++;
						this.seeders--;
					} else {
						this.leechers--;
						this.seeders++;
					}

					oldPeer.state = peer.state;
				}

			}

			peer = oldPeer;
			peer.touch();
		}
*/
/*		else if (event != EVENT_STOPPED) {
			if (peer.state === PEERSTATE_LEECHER)
				this.leechers++;
			else
				this.seeders++;
		}
*/
		return peer;
	},
	insertPeer: function(peer) {
		this.peerList.push(peer);

		console.log('insertPeer');
		console.log(this.peerList);

		for (var prop in this.peerList) {
			var p = this.peerList[prop];
			console.log(p);
		}
	},
	writePeers: function(b, count, selfPeer) {

		var c = 0;
		if (count > this.seeders + this.leechers) {
			for (var i = this.peerList.length - 1; i >= 0; i--) {
				var p = this.peerList[i];
				if (p != undefined && p != selfPeer)
				{
					p.compact.copy(b, c++ * PEER_COMPACT_SIZE);

					console.log('p.compact');

					console.log(p.compact.toString('hex', 0, p.compact.length));
				}
			}
		} else {
			var m = Math.min(this.peerList.length, count);
			for (var i = 0; i < m; i++) {
				var index = Math.floor(Math.random() * this.peerList.length);
				var p = this.peerList[index];
				if (p != undefined && p != selfPeer)
				{
					p.compact.copy(b, c++ * PEER_COMPACT_SIZE);

					console.log('p.compact');
					console.log(p.compact.toString('hex', 0, p.compact.length));
				}
			}
		}

		console.log('peerDict');
		console.log(this.peerDict);
		
		console.log('peerList');
		console.log(this.peerList);

		return c * PEER_COMPACT_SIZE;
	}
}

function Tracker() {
	if (!(this instanceof Tracker))
		return new Tracker();

	this.files = {};
}

Tracker.prototype = {
	getFile: function(infoHash) {
		if (this.files.hasOwnProperty(infoHash))
			return this.files[infoHash];

		return this.addFile(infoHash);
	},
	addFile: function(infoHash) {
		return (this.files[infoHash] = new File());
	}
}

exports.PEER_COMPACT_SIZE = PEER_COMPACT_SIZE
exports.ANNOUNCE_INTERVAL = ANNOUNCE_INTERVAL;

exports.event = event;
exports.Peer = Peer;
exports.Tracker = Tracker;
