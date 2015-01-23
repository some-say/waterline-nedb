![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# NeDB adapter

Waterline adapter for NeDB. NeDB is a performant embedded database written in pure js.

## Installation

Install from NPM.

```bash
$ npm install git://github.com/andyhu/sails-nedb --save
```

## Sails Configuration

Add the nedb config to the `config/connections.js` file.

### Using with Sails v0.10.x / v0.11.x

```javascript
module.exports.connections = {

  nedb: {
    adapter: 'sails-nedb',

    dbPath: 'path/to/nedb', // Required, set to an empty directory for a new project

    // Optional options:
    inMemoryOnly: false // Enable in memory (no file access) mode.

  }
};

## Sails.js

http://sailsjs.org

## Waterline

[Waterline](https://github.com/balderdashy/waterline) is a brand new kind of storage and retrieval engine.

It provides a uniform API for accessing stuff from different kinds of databases, protocols, and 3rd party APIs. That means you write the same code to get users, whether they live in MySQL, LDAP, MongoDB, or Facebook.


## Acknowledgement

Big thanks to the contributors of `sails-mongo`, `nedb`! Most code of this project is from sails-mongo.


## Sails.js License

### The MIT License (MIT)

Copyright © 2012-2013 Mike McNeil

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
