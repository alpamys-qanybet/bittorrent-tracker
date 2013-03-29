var dgram = require("dgram"),
	tracker = require("./tracker"),
	util = require('util');


function Reader(b) {
	this.pos = 0;
	this.b = b;
}

Reader.prototype = {
	readInt: function(size) {
		var r = 0;
		var neg = false;
		for (var i = 0; i < size; i++) {
			var c = this.b[this.pos++];

			// Check if it is a negative number
			if (i == 0 && (c & 0x80) != 0) {
				c &= 0x7f;
				neg = true;
			}
			r = r * 256 + c;
		}

		if (neg)
			r -= Math.pow(2, size * 8 - 1);

		return r;
	},
	readBytes: function(len) {
		return this.b.slice(this.pos, this.pos += len);
	},
	skip: function(s) {
		this.pos += s;
	}
}

function Writer(size) {
	this.b = new Buffer(size);
	this.pos = 0;
}

Writer.prototype = {
	writeInt: function(v, size) {
		for (var i = 1; i <= size; i++) {
			this.b[this.pos + size - i] = v & 0xff;
			v >>= 8;
		}
		this.pos += size;
	},
	writeBytes: function(b) {
		b.copy(this.b, this.pos);
		this.pos += b.length;
	},
	getBuffer: function() {
		return this.b.slice(this.pos);
	},
	resize: function(size) {
		this.b = this.b.slice(0, size);
	}
}


const MAGIC_CONNECTION_ID = new Buffer([0x00, 0x00, 0x04, 0x17, 0x27, 0x10, 0x19, 0x80]);

// Instead of random connection ids opentracker just use a "secret" one. So we do that to.
const SECRET_CONNECTION_ID = new Buffer([0x34, 0x93, 0x23, 0x12, 0x98, 0x84, 0xa9, 0xa1]);

function equalBuffer(b1, b2) {
	if (b1.length != b2.length)
		return false;

	for (var i = 0; i < b1.length; i++)
		if (b1[i] != b2[i])
			return false;

	return true;
}


function createServer(trackerInstance, port, host) {
	var server = dgram.createSocket("udp4");

	server.on("message", function (msg, rinfo) {
		console.log("server.on 'message'");
		console.log('msg');
		console.log( JSON.stringify(msg) );
		console.log(msg.toString('hex', 0, msg.length));


		console.log('rinfo');
		console.log(rinfo);

		if (msg.length < 16)
			return;

		var r = new Reader(msg);

		var connectionId = r.readBytes(8);
		var action = r.readInt(4);
		var transactionId = r.readBytes(4);

		var w = null;

		switch (action) {
			// Connect
			case 0:
				console.log('Connect');
				if (!equalBuffer(connectionId, MAGIC_CONNECTION_ID))
					return;

				w = new Writer(16);
				w.writeInt(action, 4);
				w.writeBytes(transactionId);
				w.writeBytes(SECRET_CONNECTION_ID);

				console.log('action');
				console.log(action);
				console.log('transactionId');

				// console.log(transactionId.toString('ascii', 0, transactionId.length)); // ��]g
				// console.log(transactionId.toString('utf16le', 0, transactionId.length)); // unknown encoding
				// console.log(transactionId.toString('ucs2', 0, transactionId.length)); // 餮훐
				// console.log(transactionId.toString('base64', 0, transactionId.length)); // rlgxPA==
				// console.log(transactionId.toString('binary', 0, transactionId.length)); // ®
				console.log(transactionId.toString('hex', 0, transactionId.length)); // e5f1217e
				
				console.log('SECRET_CONNECTION_ID');
				// console.log(SECRET_CONNECTION_ID.toString('ascii', 0, SECRET_CONNECTION_ID.length)); // 4�#����
				// console.log(SECRET_CONNECTION_ID.toString('utf16le', 0, SECRET_CONNECTION_ID.length)); // unknown encoding
				// console.log(SECRET_CONNECTION_ID.toString('ucs2', 0, SECRET_CONNECTION_ID.length)); // 錴ሣ蒘ꆩ
				// console.log(SECRET_CONNECTION_ID.toString('base64', 0, SECRET_CONNECTION_ID.length)); // NJMjEpiEqaE=
				// console.log(SECRET_CONNECTION_ID.toString('binary', 0, SECRET_CONNECTION_ID.length)); // 4#©¡
				console.log(SECRET_CONNECTION_ID.toString('hex', 0, SECRET_CONNECTION_ID.length)); // 349323129884a9a1

				console.log(w.b.toString('hex', 0, w.b.length));
				break;

			// Announce
			case 1:
				console.log('Announce');
				if (msg.length < 98)
					return;

				var infoHash = r.readBytes(20);
				console.log('infoHash');
				console.log(infoHash.toString('hex', 0, infoHash.length));
				
				var file = trackerInstance.getFile(infoHash);

				var peerId = r.readBytes(20);
				console.log('peerId');
				console.log(peerId.toString('hex', 0, peerId.length));

				r.skip(8); // Downloaded
				var left = r.readInt(8);
				r.skip(8); // Uploaded
				var event = r.readInt(4);
				r.skip(4); // IP
				r.skip(4); // Key
				var want = r.readInt(4);
				var port = r.readInt(2);

				var peer = tracker.Peer(rinfo.address, port, left);

				
				peer = file.addPeer(peerId, peer, event);

				// Make sure that want is at least 1
				if (want < 1)
					want = 50;

				w = new Writer(20 + want * tracker.PEER_COMPACT_SIZE);
				w.writeInt(action, 4);
				w.writeBytes(transactionId);
				w.writeInt(tracker.ANNOUNCE_INTERVAL, 4); // Interval
				w.writeInt(file.leechers, 4); // Leechers
				w.writeInt(file.seeders, 4); // Seeders

				console.log('action');
				console.log(action);
				console.log('transactionId');
				console.log(transactionId.toString('hex', 0, transactionId.length));
				console.log('tracker.ANNOUNCE_INTERVAL');
				console.log(tracker.ANNOUNCE_INTERVAL);
				console.log('file.leechers');
				console.log(file.leechers);
				console.log('file.seeders');
				console.log(file.seeders);
				

				var len = file.writePeers(w.getBuffer(), want, peer);

				console.log('len');
				console.log(len);
				w.resize(20 + len);

				console.log(w.b.toString('hex', 0, w.b.length));
				break;

			// Scrape
			case 2:
				console.log('Scrape');
				if (msg.length < 36)
					return;

				var count = (msg.length - 16) / 20;

				w = new Writer(8 + count * 12);
				w.writeInt(action, 4);
				w.writeBytes(transactionId);

				console.log(action);
				console.log(transactionId.toString('hex', 0, transactionId.length));
				
				for (var i = 0; i < count; i++) {
					var infoHash = r.readBytes(20);
					var file = trackerInstance.getFile(infoHash);
					w.writeInt(file.seeders, 4); // Seeders
					w.writeInt(file.downloads, 4); // Completed
					w.writeInt(file.leechers, 4); // Leechers

					console.log('i ' + i);
					console.log(file.seeders);
					console.log(file.downloads);
					console.log(file.leechers);
				}

				break;
		}

		if (w == null)
			return;

		server.send(w.b, 0, w.b.length, rinfo.port, rinfo.address);

		console.log('*** udp.js createServer writer w');
//		console.log(w);
//		console.log(w.b);

		console.log(w.b.toString('hex', 0, w.b.length));

//		var json = JSON.stringify(w.b);
//		console.log(json);

		console.log(rinfo.port);
		console.log(rinfo.address);
	});

	server.on("listening", function () {
		var address = server.address();
		console.log("UDP server listening " + address.address + ":" + address.port);
	});

	server.bind(port, host);
}

exports.createServer = createServer;
