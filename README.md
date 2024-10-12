Zua gRPC interface
===

Zua gRPC module is a basic request/response wrapper for interfacing with [Zuad](https://github.com/zuanet/zuad)

Usage
---
Clone the following repository:

    $ git clone https://github.com/zuanet/zua-grpc

Example
---
```js
const { Client } = require('@zua/grpc');

const client = new Client({
    host:"127.0.0.1:16210"
});
client.connect();
client.verbose = true;

try {
    let response = await client.call('getMempoolEntriesRequest', { });
    console.log(response);
} catch(ex) {
    ...
}

client.call('getVirtualSelectedParentBlueScoreRequest', { }).then((response)=>{
    console.log(response);
}).catch((err)=>{
    console.log('error:',err);
})
```