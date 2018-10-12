const fs = require('fs');
const {promisify} = require('util');
const stream = require('stream');
const EventEmitter = require('events');

const openFile = promisify(fs.open);
const writeFile = promisify(fs.write);
const readFile = promisify(fs.read);

class StreamFsCache extends stream.Duplex {
    constructor(path, options) {
        super(options)

        this.newDataEmitter = new EventEmitter();
        this.writePosition = 0;
        this.path = path;
        this.readPosition = 0;
        this.readableBytes = 0;
    }

    _write(chunk, encoding, callback) {
        (async () => {
            try {
                if (this.fd == null)
                    this.fd = await openFile(this.path, 'w+');

                const {bytesWritten} = await writeFile(this.fd, chunk, 0, chunk.length, this.writePosition);

                this.readableBytes += bytesWritten;
                this.writePosition += bytesWritten;

                this.newDataEmitter.emit('data');

                callback();
            } catch (err) {
                callback(err);
            }
        })();
    }

    _read(size) {
        const processData = async () => {
            let bytesToRead = Math.min(this.readableBytes, size);

            try {
                const {bytesRead, buffer} = await readFile(this.fd, Buffer.alloc(bytesToRead), 0, bytesToRead, this.readPosition);

                this.readableBytes -= bytesRead;
                this.readPosition += bytesRead;

                this.push(buffer);
            } catch (err) {
                this.emit('error', err);
            }
        };

        if (this.readableBytes > 0)
            processData();
        else
            this.newDataEmitter.once('data', processData);
    }
}

module.exports = {
    StreamFsCache
}