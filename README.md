# stream-fs-cache
A node duplex stream used for caching stream information to the file system while processing.

This module streams incoming data straight to a file on the hard disk as quickly as possible.  As it is streaming to disk, it also streams the information from the disk to the reading stream as quickly as the reading stream can process it.

This module is extremely efficient because it quickly terminates the writable stream as soon as possible, allows for the processing of the data before the writing stream has completed, and also maintains as little information in memory at a single time as possible.

## Install
```
npm install stream-fs-cache
```

## Example
```
const request = require('request'); // For the writing stream from http
const JSONStream = require('JSONStream'); // For slower parsing json as it arrives.
const es = require('event-stream'); // For the processing of the json as it is parsed.

// Loading the module
const {StreamFsCache} = require('stream-fs-cache');

// Choosing a file to cache to
const streamFsCache = new StreamFsCache('cache.json');

// Running the stream and logging the data
request({url: 'some_url'})
.pipe(streamFsCache)
.pipe(JSONStream.parse('rows.*')) // For data that has a property 'rows' that is an array
.pipe(es.mapSync((data) => console.error(data)); // For logging the row data to the console
```
