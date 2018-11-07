const fs = require('fs');
const {promisify} = require('util');
const stream = require('stream');
const EventEmitter = require('events');

const openFile = promisify(fs.open);
const closeFile = promisify(fs.close);
const writeFile = promisify(fs.write);
const readFile = promisify(fs.read);

const apply = (fn, self) => fn.apply(self);

class StreamFsCache extends stream.Duplex {
    constructor(path, options) {
        super(options)

        this._controlEventEmitter = new EventEmitter();
        this._writePosition = 0;
        this._path = path;
        this._readPosition = 0;
        this._readableBytes = 0;

        this._processData = async (size = null) => {
            let bytesToRead = size === null ? this._readableBytes : Math.min(this._readableBytes, size);

            try {
                const {bytesRead, buffer} = await readFile(this.fd, Buffer.alloc(bytesToRead), 0, bytesToRead, this._readPosition);
    
                this._readableBytes -= bytesRead;
                this._readPosition += bytesRead;
    
                this.push(buffer);

                if (this._readableBytes === 0)
                    this._controlEventEmitter.emit('empty');
            } catch (err) {
                this.emit('error', err);
            } 
        }
    }

    _write(chunk, encoding, callback) {
        apply(async () => {
            try {
                if (this.fd == null)
                    this.fd = await openFile(this._path, 'w+');

                const {bytesWritten} = await writeFile(this.fd, chunk, 0, chunk.length, this._writePosition);

                this._readableBytes += bytesWritten;
                this._writePosition += bytesWritten;

                this._controlEventEmitter.emit('data');

                callback();
            } catch (err) {
                callback(err);
            }
        }, this);
    }

    _read(size) {
        if (this._readableBytes > 0)
            this._processData(size);
        else
            this._controlEventEmitter.once('data', this._processData);
    }

    _final(callback) {
        const finalize = async () => {
            try {
                this.push(null);

                await closeFile(this.fd);

                callback();
            } catch (err) {
                callback(err);
            }
        }

        if (this._readableBytes > 0)
            this._controlEventEmitter.once('empty', finalize);
        else
            finalize();
    }
}

module.exports = {
    StreamFsCache
}